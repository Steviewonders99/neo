/// Ring buffer of the last `cap` bytes of decoded, ANSI-stripped text.
pub struct TailBuffer {
    buf: Vec<u8>,
    cap: usize,
}

impl TailBuffer {
    pub fn new(cap: usize) -> Self {
        Self { buf: Vec::with_capacity(cap), cap }
    }

    pub fn push(&mut self, chunk: &[u8]) {
        let stripped = strip_ansi_escapes::strip(chunk);
        for &b in stripped.iter() {
            if self.buf.len() == self.cap {
                self.buf.remove(0);
            }
            self.buf.push(b);
        }
    }

    pub fn as_str(&self) -> std::borrow::Cow<'_, str> {
        String::from_utf8_lossy(&self.buf)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_ansi_color_codes() {
        let mut tb = TailBuffer::new(1024);
        tb.push(b"\x1b[31mhello\x1b[0m world");
        assert_eq!(tb.as_str(), "hello world");
    }

    #[test]
    fn drops_oldest_when_capacity_exceeded() {
        let mut tb = TailBuffer::new(4);
        tb.push(b"abcdef");
        assert_eq!(tb.as_str(), "cdef");
    }

    #[test]
    fn handles_empty_chunk() {
        let mut tb = TailBuffer::new(16);
        tb.push(b"");
        assert_eq!(tb.as_str(), "");
    }
}

use once_cell::sync::Lazy;
use regex::RegexSet;

static ATTENTION_PATTERNS: Lazy<RegexSet> = Lazy::new(|| {
    RegexSet::new([
        r"(?i)Do you want to proceed\?",
        r"\(y/N\)\s*$",
        r"\(y/n\)\s*$",
        r"(?i)permission to (run|edit|write|read)",
        r"\[y/n/a\]",
        r"❯\s*$",
    ])
    .expect("valid regex set")
});

pub fn is_attention(tail: &str) -> bool {
    ATTENTION_PATTERNS.is_match(tail.trim_end_matches(|c: char| c.is_whitespace() && c != '\n').trim_end())
}

#[cfg(test)]
mod attention_tests {
    use super::*;

    #[test]
    fn detects_do_you_want_to_proceed() {
        assert!(is_attention("Some output\nDo you want to proceed?"));
    }

    #[test]
    fn detects_y_n_prompt() {
        assert!(is_attention("continue? (y/N) "));
        assert!(is_attention("are you sure? (y/n)"));
    }

    #[test]
    fn detects_permission_phrasing() {
        assert!(is_attention("Claude needs permission to run rm -rf"));
        assert!(is_attention("permission to edit file"));
    }

    #[test]
    fn detects_y_n_a_choice() {
        assert!(is_attention("approve? [y/n/a]"));
    }

    #[test]
    fn detects_idle_prompt_arrow() {
        assert!(is_attention("some stuff\n❯ "));
    }

    #[test]
    fn ignores_normal_output() {
        assert!(!is_attention("npm install completed"));
        assert!(!is_attention("warning: foo"));
    }
}

use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ActivityState {
    Starting,
    Working,
    Idle,
    Attention,
}

pub struct ActivityDetector {
    tail: TailBuffer,
    state: ActivityState,
    last_output: Instant,
    silence_threshold: Duration,
}

impl ActivityDetector {
    pub fn new() -> Self {
        Self {
            tail: TailBuffer::new(4096),
            state: ActivityState::Starting,
            last_output: Instant::now(),
            silence_threshold: Duration::from_millis(800),
        }
    }

    /// Call when bytes arrive on the PTY. Returns the new state if it changed.
    pub fn on_output(&mut self, chunk: &[u8]) -> Option<ActivityState> {
        self.tail.push(chunk);
        self.last_output = Instant::now();
        self.set(ActivityState::Working)
    }

    /// Call periodically (e.g. every 250 ms). Returns the new state if it changed.
    pub fn tick(&mut self) -> Option<ActivityState> {
        if self.state == ActivityState::Working
            && self.last_output.elapsed() >= self.silence_threshold
        {
            let next = if is_attention(&self.tail.as_str()) {
                ActivityState::Attention
            } else {
                ActivityState::Idle
            };
            return self.set(next);
        }
        None
    }

    fn set(&mut self, next: ActivityState) -> Option<ActivityState> {
        if self.state == next {
            None
        } else {
            self.state = next;
            Some(next)
        }
    }

    pub fn state(&self) -> ActivityState {
        self.state
    }
}

#[cfg(test)]
mod state_machine_tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn output_transitions_to_working() {
        let mut d = ActivityDetector::new();
        assert_eq!(d.on_output(b"some output"), Some(ActivityState::Working));
        assert_eq!(d.state(), ActivityState::Working);
    }

    #[test]
    fn no_double_emit_when_already_working() {
        let mut d = ActivityDetector::new();
        d.on_output(b"a");
        assert_eq!(d.on_output(b"b"), None);
    }

    #[test]
    fn silence_with_normal_tail_goes_idle() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_millis(20);
        d.on_output(b"build complete\n");
        sleep(Duration::from_millis(40));
        assert_eq!(d.tick(), Some(ActivityState::Idle));
    }

    #[test]
    fn silence_with_attention_tail_goes_attention() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_millis(20);
        d.on_output(b"Run command? (y/N) ");
        sleep(Duration::from_millis(40));
        assert_eq!(d.tick(), Some(ActivityState::Attention));
    }

    #[test]
    fn tick_before_silence_returns_none() {
        let mut d = ActivityDetector::new();
        d.silence_threshold = Duration::from_secs(10);
        d.on_output(b"x");
        assert_eq!(d.tick(), None);
    }
}

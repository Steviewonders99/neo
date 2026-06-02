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

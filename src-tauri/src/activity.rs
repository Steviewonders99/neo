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

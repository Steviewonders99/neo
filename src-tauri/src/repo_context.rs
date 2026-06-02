use std::path::Path;
use std::process::Command;

pub fn build_repo_context(cwd: &str) -> String {
    let mut parts: Vec<String> = Vec::new();

    if let Some(claudemd) = read_first_kb(cwd, "CLAUDE.md") {
        parts.push(format!("## CLAUDE.md\n{claudemd}"));
    }

    if let Some(readme) = read_first_kb(cwd, "README.md") {
        parts.push(format!("## README (first 1KB)\n{readme}"));
    }

    if let Some(pkg) = read_first_kb(cwd, "package.json") {
        parts.push(format!("## package.json\n{pkg}"));
    } else if let Some(cargo) = read_first_kb(cwd, "Cargo.toml") {
        parts.push(format!("## Cargo.toml\n{cargo}"));
    } else if let Some(pyproj) = read_first_kb(cwd, "pyproject.toml") {
        parts.push(format!("## pyproject.toml\n{pyproj}"));
    }

    if let Some(log) = recent_git_log(cwd) {
        parts.push(format!("## Recent commits\n{log}"));
    }

    if let Some(layout) = top_level_dirs(cwd) {
        parts.push(format!("## Top-level layout\n{layout}"));
    }

    parts.join("\n\n")
}

fn read_first_kb(cwd: &str, name: &str) -> Option<String> {
    let path = Path::new(cwd).join(name);
    let content = std::fs::read_to_string(&path).ok()?;
    let truncated: String = content.chars().take(1024).collect();
    Some(truncated)
}

fn recent_git_log(cwd: &str) -> Option<String> {
    let out = Command::new("git")
        .arg("log")
        .arg("--oneline")
        .arg("-5")
        .current_dir(cwd)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() { None } else { Some(s) }
}

fn top_level_dirs(cwd: &str) -> Option<String> {
    let entries = std::fs::read_dir(cwd).ok()?;
    let mut names: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .filter_map(|e| e.file_name().into_string().ok())
        .filter(|n| !n.starts_with('.') && n != "node_modules" && n != "target" && n != "dist")
        .take(20)
        .collect();
    names.sort();
    if names.is_empty() { None } else { Some(names.join(", ")) }
}

#[tauri::command]
pub fn build_repo_context_cmd(cwd: String) -> String {
    build_repo_context(&cwd)
}

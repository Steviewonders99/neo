use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentDir {
    pub cwd: String,
    pub repo: String,
    pub last_used_at: i64, // unix seconds
}

fn store_path() -> PathBuf {
    let mut p = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("com.junop.terminalpanes");
    fs::create_dir_all(&p).ok();
    p.push("recent.json");
    p
}

pub fn load() -> Vec<RecentDir> {
    let p = store_path();
    fs::read_to_string(&p)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<RecentDir>>(&s).ok())
        .unwrap_or_default()
}

fn save(list: &[RecentDir]) -> std::io::Result<()> {
    let p = store_path();
    fs::write(&p, serde_json::to_string_pretty(list).unwrap_or_default())
}

pub fn add(cwd: &str) -> Vec<RecentDir> {
    let mut list = load();
    list.retain(|r| r.cwd != cwd);
    let repo = std::path::Path::new(cwd)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(cwd)
        .to_string();
    list.insert(
        0,
        RecentDir {
            cwd: cwd.to_string(),
            repo,
            last_used_at: chrono_secs(),
        },
    );
    list.truncate(20);
    save(&list).ok();
    list
}

fn chrono_secs() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

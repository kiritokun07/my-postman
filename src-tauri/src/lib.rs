use std::collections::HashMap;
use std::time::{Duration, Instant};

use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProxyRequest {
    method: Option<String>,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProxyResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    duration: u64,
    size: usize,
    is_base64: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn is_text_content_type(content_type: &str) -> bool {
    content_type.contains("application/json")
        || content_type.contains("text/")
        || content_type.contains("application/xml")
        || content_type.contains("application/javascript")
        || content_type.contains("application/x-www-form-urlencoded")
}

fn map_request_error(err: reqwest::Error, url: &str) -> String {
    if err.is_timeout() {
        return format!("Request timed out: {url}");
    }
    if err.is_connect() {
        let msg = err.to_string().to_lowercase();
        if msg.contains("dns") || msg.contains("lookup") || msg.contains("not found") {
            return format!("Host not found: {url}");
        }
        return format!("Connection refused: {url}");
    }
    err.to_string()
}

#[tauri::command]
async fn proxy_request(request: ProxyRequest) -> Result<ProxyResponse, String> {
    if request.url.trim().is_empty() {
        return Err("URL is required".to_string());
    }

    let method_str = request.method.as_deref().unwrap_or("GET").to_uppercase();
    let method = reqwest::Method::from_bytes(method_str.as_bytes())
        .map_err(|_| format!("Invalid HTTP method: {method_str}"))?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req_builder = client.request(method, &request.url);

    if let Some(headers) = request.headers {
        let mut header_map = HeaderMap::new();
        for (key, value) in headers {
            if let (Ok(name), Ok(val)) = (
                HeaderName::from_bytes(key.as_bytes()),
                HeaderValue::from_str(&value),
            ) {
                header_map.insert(name, val);
            }
        }
        req_builder = req_builder.headers(header_map);
    }

    if let Some(body) = request.body {
        if !body.is_empty() {
            req_builder = req_builder.body(body);
        }
    }

    let start = Instant::now();
    let response = req_builder
        .send()
        .await
        .map_err(|e| map_request_error(e, &request.url))?;

    let duration = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let response_headers: HashMap<String, String> = response
        .headers()
        .iter()
        .filter_map(|(k, v)| {
            v.to_str()
                .ok()
                .map(|val| (k.as_str().to_string(), val.to_string()))
        })
        .collect();

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let size = bytes.len();

    let (body, is_base64) = if is_text_content_type(&content_type) {
        (String::from_utf8_lossy(&bytes).into_owned(), false)
    } else {
        (STANDARD.encode(&bytes), true)
    };

    Ok(ProxyResponse {
        status,
        status_text,
        headers: response_headers,
        body,
        duration,
        size,
        is_base64,
        error: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![proxy_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

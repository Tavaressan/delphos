#[tokio::main]
async fn main() {
    println!("RAG Worker starting Semântico/HNSW...");
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        println!("RAG Worker heartbeat");
    }
}

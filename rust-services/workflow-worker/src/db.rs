use sqlx::PgPool;
use uuid::Uuid;

#[derive(sqlx::FromRow, serde::Deserialize, Debug, Clone)]
pub struct DbNode {
    pub id: Uuid,
    #[allow(dead_code)]
    pub workflow_id: Uuid,
    #[allow(dead_code)]
    pub version: i32,
    #[serde(rename = "type")]
    pub node_type: String,
    pub config: Option<serde_json::Value>,
}

#[derive(sqlx::FromRow, serde::Deserialize, Debug, Clone)]
pub struct DbEdge {
    #[allow(dead_code)]
    pub id: Uuid,
    #[allow(dead_code)]
    pub workflow_id: Uuid,
    #[allow(dead_code)]
    pub version: i32,
    pub from_node_id: Uuid,
    pub to_node_id: Uuid,
    #[allow(dead_code)]
    pub condition: Option<String>,
}

pub async fn load_dag(
    pool: &PgPool,
    workflow_id: Uuid,
    version: i32,
) -> Result<(Vec<DbNode>, Vec<DbEdge>), sqlx::Error> {
    let nodes = sqlx::query_as::<_, DbNode>(
        "SELECT id, workflow_id, version, type as node_type, config FROM workflow_nodes WHERE workflow_id = $1 AND version = $2"
    )
    .bind(workflow_id)
    .bind(version)
    .fetch_all(pool)
    .await?;

    let edges = sqlx::query_as::<_, DbEdge>(
        "SELECT id, workflow_id, version, from_node_id, to_node_id, condition FROM workflow_edges WHERE workflow_id = $1 AND version = $2"
    )
    .bind(workflow_id)
    .bind(version)
    .fetch_all(pool)
    .await?;

    Ok((nodes, edges))
}

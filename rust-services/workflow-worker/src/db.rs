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
    tenant_id: Uuid,
    workflow_id: Uuid,
    version: i32,
) -> Result<(Vec<DbNode>, Vec<DbEdge>), sqlx::Error> {
    let nodes = sqlx::query_as::<_, DbNode>(
        "SELECT n.id, n.workflow_id, n.version, n.type as node_type, n.config FROM workflow_nodes n JOIN workflow_definitions w ON n.workflow_id = w.id WHERE n.workflow_id = $1 AND n.version = $2 AND w.tenant_id = $3"
    )
    .bind(workflow_id)
    .bind(version)
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    let edges = sqlx::query_as::<_, DbEdge>(
        "SELECT e.id, e.workflow_id, e.version, e.from_node_id, e.to_node_id, e.condition FROM workflow_edges e JOIN workflow_definitions w ON e.workflow_id = w.id WHERE e.workflow_id = $1 AND e.version = $2 AND w.tenant_id = $3"
    )
    .bind(workflow_id)
    .bind(version)
    .bind(tenant_id)
    .fetch_all(pool)
    .await?;

    Ok((nodes, edges))
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[sqlx::test]
    async fn test_load_dag_tenant_isolation(pool: sqlx::PgPool) {
        let tenant_a = Uuid::new_v4();
        let tenant_b = Uuid::new_v4();
        let workflow_id = Uuid::new_v4();
        let name = format!("Test Workflow {}", workflow_id);

        sqlx::query(
            "INSERT INTO workflow_definitions (id, name, description, active_version, tenant_id) VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(workflow_id)
        .bind(&name)
        .bind("Test Description")
        .bind(1)
        .bind(tenant_a)
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO workflow_versions (workflow_id, version, created_by) VALUES ($1, $2, $3)"
        )
        .bind(workflow_id)
        .bind(1)
        .bind("test")
        .execute(&pool)
        .await
        .unwrap();

        let node_id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO workflow_nodes (id, workflow_id, version, type, config) VALUES ($1, $2, $3, $4, $5)"
        )
        .bind(node_id)
        .bind(workflow_id)
        .bind(1)
        .bind("RAG")
        .bind(serde_json::json!({}))
        .execute(&pool)
        .await
        .unwrap();

        let (nodes, _) = load_dag(&pool, tenant_a, workflow_id, 1).await.unwrap();
        assert_eq!(nodes.len(), 1, "Should return 1 node for the correct tenant");

        let (nodes, _) = load_dag(&pool, tenant_b, workflow_id, 1).await.unwrap();
        assert_eq!(nodes.len(), 0, "Should return 0 nodes for another tenant");
    }
}

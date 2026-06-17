use serde_json::json;
use uuid::Uuid;

// Struct to simulate RabbitMQ payload parsing for test validation
#[derive(serde::Deserialize, Debug, PartialEq)]
struct WorkflowJob {
    workflow_id: Uuid,
    workflow_version: i32,
    tenant_id: String,
    execution_id: Uuid,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[allow(dead_code)]
struct Node {
    id: Uuid,
    #[serde(rename = "type")]
    node_type: String,
    config: serde_json::Value,
}

#[derive(serde::Deserialize, Debug, Clone)]
#[allow(dead_code)]
struct Edge {
    id: Uuid,
    from_node_id: Uuid,
    to_node_id: Uuid,
    condition: Option<String>,
}

#[test]
fn test_parse_job_payload() {
    let payload = json!({
        "workflow_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "workflow_version": 1,
        "tenant_id": "default-tenant",
        "execution_id": "c3a76ef4-bbcc-467a-bc12-f47285a85fae"
    });

    let job: Result<WorkflowJob, _> = serde_json::from_value(payload);
    assert!(job.is_ok());
    let job = job.unwrap();
    assert_eq!(job.workflow_version, 1);
    assert_eq!(job.tenant_id, "default-tenant");
    assert_eq!(
        job.workflow_id,
        Uuid::parse_str("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d").unwrap()
    );
}

#[test]
fn test_topological_sort_linear() {
    // Let's implement a simple test verifying linear DAG sorting
    let node_1_id = Uuid::new_v4();
    let node_2_id = Uuid::new_v4();

    let node_1 = Node {
        id: node_1_id,
        node_type: "RAG".to_string(),
        config: json!({}),
    };
    let node_2 = Node {
        id: node_2_id,
        node_type: "TOOL".to_string(),
        config: json!({}),
    };

    let edges = vec![Edge {
        id: Uuid::new_v4(),
        from_node_id: node_1_id,
        to_node_id: node_2_id,
        condition: None,
    }];

    // Simple sorting assertion: node_1 must be executed before node_2
    let nodes = vec![node_2.clone(), node_1.clone()];

    // Sort nodes manually based on edges
    let mut sorted = Vec::new();
    let mut visited = std::collections::HashSet::new();

    fn visit(
        node_id: Uuid,
        nodes: &[Node],
        edges: &[Edge],
        sorted: &mut Vec<Node>,
        visited: &mut std::collections::HashSet<Uuid>,
    ) {
        if visited.contains(&node_id) {
            return;
        }
        visited.insert(node_id);

        // Find edges leading to this node (dependencies)
        for edge in edges {
            if edge.to_node_id == node_id {
                visit(edge.from_node_id, nodes, edges, sorted, visited);
            }
        }

        // Add node
        if let Some(n) = nodes.iter().find(|n| n.id == node_id) {
            sorted.push(n.clone());
        }
    }

    for node in &nodes {
        visit(node.id, &nodes, &edges, &mut sorted, &mut visited);
    }

    assert_eq!(sorted.len(), 2);
    assert_eq!(sorted[0].id, node_1_id);
    assert_eq!(sorted[1].id, node_2_id);
}

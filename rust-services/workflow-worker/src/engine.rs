use crate::db::{DbEdge, DbNode};
use anyhow::{anyhow, Result};
use std::collections::{HashMap, HashSet};
use tokio::time::{sleep, Duration};
use uuid::Uuid;

pub struct WorkflowEngine {
    nodes: Vec<DbNode>,
    edges: Vec<DbEdge>,
}

impl WorkflowEngine {
    pub fn new(nodes: Vec<DbNode>, edges: Vec<DbEdge>) -> Self {
        Self { nodes, edges }
    }

    /// Sorts nodes topologically to define a safe and linear execution path.
    pub fn sort_nodes(&self) -> Result<Vec<DbNode>> {
        let mut sorted = Vec::new();
        let mut visited = HashSet::new();
        let mut temp_visited = HashSet::new();

        // Helper map to quickly find nodes by UUID
        let node_map: HashMap<Uuid, &DbNode> = self.nodes.iter().map(|n| (n.id, n)).collect();

        fn visit(
            node_id: Uuid,
            node_map: &HashMap<Uuid, &DbNode>,
            edges: &[DbEdge],
            sorted: &mut Vec<DbNode>,
            visited: &mut HashSet<Uuid>,
            temp_visited: &mut HashSet<Uuid>,
        ) -> Result<()> {
            if temp_visited.contains(&node_id) {
                return Err(anyhow!("Ciclo detectado na topologia da DAG."));
            }
            if !visited.contains(&node_id) {
                temp_visited.insert(node_id);

                // Visit all dependencies (nodes pointing to this node)
                for edge in edges {
                    if edge.to_node_id == node_id {
                        visit(
                            edge.from_node_id,
                            node_map,
                            edges,
                            sorted,
                            visited,
                            temp_visited,
                        )?;
                    }
                }

                temp_visited.remove(&node_id);
                visited.insert(node_id);

                if let Some(&node) = node_map.get(&node_id) {
                    sorted.push(node.clone());
                }
            }
            Ok(())
        }

        for node in &self.nodes {
            visit(
                node.id,
                &node_map,
                &self.edges,
                &mut sorted,
                &mut visited,
                &mut temp_visited,
            )?;
        }

        Ok(sorted)
    }

    /// Executes the sorted nodes in sequence under the configured timeout.
    pub async fn execute(
        &self,
        channel: &lapin::Channel,
        execution_id: Uuid,
    ) -> Result<String> {
        let sorted_nodes = self.sort_nodes()?;
        println!("Executing DAG containing {} nodes.", sorted_nodes.len());

        let execution_future = async {
            for (idx, node) in sorted_nodes.iter().enumerate() {
                println!(
                    "[{}/{}] Executing node of type '{}' (ID: {})",
                    idx + 1,
                    sorted_nodes.len(),
                    node.node_type,
                    node.id
                );

                match node.node_type.to_uppercase().as_str() {
                    "RAG" => {
                        println!("Dispatching RAG node to agent.retrieval.requested...");
                        let payload = serde_json::to_vec(&serde_json::json!({
                            "executionId": execution_id,
                            "nodeId": node.id,
                            "config": node.config
                        })).unwrap();
                        channel
                            .basic_publish(
                                "agent.execution.exchange",
                                "agent.retrieval.requested",
                                lapin::options::BasicPublishOptions::default(),
                                &payload,
                                lapin::BasicProperties::default(),
                            )
                            .await
                            .map_err(|e| anyhow!("Failed to publish RAG node: {}", e))?;
                    }
                    "TOOL" => {
                        let tool_name = node
                            .config
                            .as_ref()
                            .and_then(|c| c.get("toolName"))
                            .and_then(|t| t.as_str())
                            .unwrap_or("generic_tool");
                        println!("Dispatching TOOL node ({}) to agent.tool.requested...", tool_name);
                        let payload = serde_json::to_vec(&serde_json::json!({
                            "executionId": execution_id,
                            "nodeId": node.id,
                            "toolName": tool_name,
                            "config": node.config
                        })).unwrap();
                        channel
                            .basic_publish(
                                "agent.execution.exchange",
                                "agent.tool.requested",
                                lapin::options::BasicPublishOptions::default(),
                                &payload,
                                lapin::BasicProperties::default(),
                            )
                            .await
                            .map_err(|e| anyhow!("Failed to publish TOOL node: {}", e))?;
                    }
                    _ => {
                        println!("Simulating execution of generic node...");
                        sleep(Duration::from_millis(50)).await;
                    }
                }
            }
            Ok(format!(
                "DAG executed successfully ({} nodes).",
                sorted_nodes.len()
            ))
        };

        // Enforce 15 seconds execution limit using tokio::time::timeout
        match tokio::time::timeout(Duration::from_secs(15), execution_future).await {
            Ok(result) => result,
            Err(_) => Err(anyhow!("TIMEOUT")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_node(node_type: &str) -> DbNode {
        DbNode {
            id: Uuid::new_v4(),
            workflow_id: Uuid::new_v4(),
            version: 1,
            node_type: node_type.to_string(),
            config: None,
        }
    }

    fn make_edge(from: Uuid, to: Uuid) -> DbEdge {
        DbEdge {
            id: Uuid::new_v4(),
            workflow_id: Uuid::new_v4(),
            version: 1,
            from_node_id: from,
            to_node_id: to,
            condition: None,
        }
    }

    #[test]
    fn test_sort_nodes_linear_dag() {
        let node_1 = make_node("RAG");
        let node_2 = make_node("TOOL");
        let edges = vec![make_edge(node_1.id, node_2.id)];

        // Nodes provided out of order on purpose to verify the sort corrects it.
        let engine = WorkflowEngine::new(vec![node_2.clone(), node_1.clone()], edges);
        let sorted = engine.sort_nodes().unwrap();

        assert_eq!(sorted.len(), 2);
        assert_eq!(sorted[0].id, node_1.id);
        assert_eq!(sorted[1].id, node_2.id);
    }

    #[test]
    fn test_sort_nodes_diamond_dag_respects_dependencies() {
        let node_a = make_node("RAG");
        let node_b = make_node("TOOL");
        let node_c = make_node("TOOL");
        let node_d = make_node("RAG");
        let edges = vec![
            make_edge(node_a.id, node_b.id),
            make_edge(node_a.id, node_c.id),
            make_edge(node_b.id, node_d.id),
            make_edge(node_c.id, node_d.id),
        ];

        let engine = WorkflowEngine::new(
            vec![
                node_d.clone(),
                node_c.clone(),
                node_b.clone(),
                node_a.clone(),
            ],
            edges,
        );
        let sorted = engine.sort_nodes().unwrap();

        let pos = |id: Uuid| sorted.iter().position(|n| n.id == id).unwrap();
        assert_eq!(sorted.len(), 4);
        assert!(pos(node_a.id) < pos(node_b.id));
        assert!(pos(node_a.id) < pos(node_c.id));
        assert!(pos(node_b.id) < pos(node_d.id));
        assert!(pos(node_c.id) < pos(node_d.id));
    }

    #[test]
    fn test_sort_nodes_detects_cycle() {
        let node_1 = make_node("RAG");
        let node_2 = make_node("TOOL");
        let edges = vec![
            make_edge(node_1.id, node_2.id),
            make_edge(node_2.id, node_1.id),
        ];

        let engine = WorkflowEngine::new(vec![node_1, node_2], edges);
        let result = engine.sort_nodes();

        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Ciclo detectado"));
    }

    #[test]
    fn test_sort_nodes_empty_dag_returns_empty() {
        let engine = WorkflowEngine::new(vec![], vec![]);
        let sorted = engine.sort_nodes().unwrap();
        assert!(sorted.is_empty());
    }
}

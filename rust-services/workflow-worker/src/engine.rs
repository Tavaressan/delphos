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
    pub async fn execute(&self) -> Result<String> {
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
                        println!("Processing RAG search semantic calculations...");
                        sleep(Duration::from_millis(800)).await;
                    }
                    "TOOL" => {
                        let tool_name = node
                            .config
                            .as_ref()
                            .and_then(|c| c.get("toolName"))
                            .and_then(|t| t.as_str())
                            .unwrap_or("generic_tool");
                        println!("Calling tool: {}", tool_name);
                        sleep(Duration::from_millis(1200)).await;
                    }
                    _ => {
                        println!("Simulating execution of generic node...");
                        sleep(Duration::from_millis(500)).await;
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

"""Reference multi-party cycle finder. Production matching remains in API baseline."""
import networkx as nx

def find_trade_cycles(edges, max_length=4):
    """edges: (giver, receiver, item_id, score); returns simple cycles of 2–4 distinct users."""
    g = nx.DiGraph()
    for giver, receiver, item_id, score in edges:
        if giver != receiver:
            g.add_edge(giver, receiver, item_id=item_id, score=score)
    return [cycle for cycle in nx.simple_cycles(g, length_bound=max_length) if 2 <= len(cycle) <= max_length]

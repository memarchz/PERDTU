from graph import find_trade_cycles

def test_three_party_cycle():
    edges=[('A','B','i1',.9),('B','C','i2',.8),('C','A','i3',.7)]
    cycles=find_trade_cycles(edges)
    assert any(set(c)=={'A','B','C'} for c in cycles)

def test_no_self_exchange():
    assert find_trade_cycles([('A','A','i1',1)])==[]

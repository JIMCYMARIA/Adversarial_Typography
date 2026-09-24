from backend.main import SanitizeRequest, sanitize


def test_quarantines_only_flagged_span_when_text_is_repeated():
    analysis={
        "spans":[
            {"page":1,"text":"Same phrase","block":0,"line":0,"span":0},
            {"page":1,"text":"Same phrase","block":1,"line":0,"span":0},
        ],
        "findings":[{"page":1,"features":{"page":1,"block":1,"line":0,"span":0},"text":"Same phrase"}],
    }
    result=sanitize(SanitizeRequest(analysis=analysis))
    assert result["label"]=="SANITIZED SEMANTIC REPRESENTATION"
    assert len(result["observed_text"])==2
    assert len(result["quarantined_text"])==1
    assert result["sanitized_text"]=="Same phrase"

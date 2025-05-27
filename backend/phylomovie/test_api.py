import io
import os
import pytest
from phylomovie.run import app as flask_app

@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client

def test_about(client):
    resp = client.get("/about")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "about" in data
    assert "phylo" in data["about"].lower()

def test_favicon(client):
    resp = client.get("/favicon.ico")
    assert resp.status_code == 200
    assert resp.mimetype == "image/vnd.microsoft.icon"

def test_static_file(client):
    # Try to serve a known static file (adjust as needed)
    static_path = os.path.join(os.path.dirname(__file__), "static", "winbox.min.css")
    if os.path.exists(static_path):
        resp = client.get("/static/winbox.min.css")
        assert resp.status_code == 200
        assert "text/css" in resp.mimetype
    else:
        pytest.skip("winbox.min.css not found in static")

def test_treedata_no_file(client):
    resp = client.post("/treedata", data={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
    assert "treeFile" in data["error"]

def test_treedata_empty_file(client):
    data = {"treeFile": (io.BytesIO(b""), "empty.newick")}
    resp = client.post("/treedata", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
    assert "treeFile" in data["error"]

def test_treedata_valid_file(client):
    # Minimal valid Newick string for a single tree
    newick = b"(A,B,(C,D));"
    data = {
        "treeFile": (io.BytesIO(newick), "test.newick"),
        "windowSize": "2",
        "windowStepSize": "1",
    }
    resp = client.post("/treedata", data=data, content_type="multipart/form-data")
    assert resp.status_code == 200
    result = resp.get_json()
    for key in [
        "tree_list", "rfd_list", "to_be_highlighted", "sorted_leaves",
        "file_name", "window_size", "window_step_size", "embedding"
    ]:
        assert key in result
    assert (
        "weighted_robinson_foulds_distance_list" in result
        or "weighted_rfd_list" in result
    )
    assert result["file_name"] == "test.newick"

def test_treedata_alltree_57_58(client):
    # Use the provided alltree_57_58.newick file for a realistic test
    newick_path = os.path.join(
        os.path.dirname(__file__),
        "services",
        "test-data",
        "alltrees",
        "alltree_57_58.newick",
    )
    with open(newick_path, "rb") as f:
        data = {
            "treeFile": (f, "alltree_57_58.newick"),
            "windowSize": "2",
            "windowStepSize": "1",
        }
        rv = client.post("/treedata", data=data, content_type="multipart/form-data")
        assert rv.status_code == 200
        result = rv.get_json()
        for key in [
            "tree_list", "rfd_list", "to_be_highlighted", "sorted_leaves",
            "file_name", "window_size", "window_step_size", "embedding"
        ]:
            assert key in result
        assert (
            "weighted_robinson_foulds_distance_list" in result
            or "weighted_rfd_list" in result
        )
        assert result["file_name"] == "alltree_57_58.newick"

def test_treedata_bigger_tree(client):
    # Create a bigger Newick tree with 20 leaves
    leaves = [f"A{i}" for i in range(1, 21)]
    newick_str = "(" + ",".join(f"{leaf}:1" for leaf in leaves) + ");"
    data = {
        "treeFile": (io.BytesIO(newick_str.encode()), "bigger.tree"),
        "windowSize": "2",
        "windowStepSize": "1",
    }
    rv = client.post("/treedata", data=data, content_type="multipart/form-data")
    assert rv.status_code == 200
    result = rv.get_json()
    for key in [
        "tree_list", "rfd_list", "to_be_highlighted", "sorted_leaves",
        "file_name", "window_size", "window_step_size", "embedding"
    ]:
        assert key in result
    assert (
        "weighted_robinson_foulds_distance_list" in result
        or "weighted_rfd_list" in result
    )
    assert result["file_name"] == "bigger.tree"
    assert len(result["sorted_leaves"]) == 20

def test_cause_error(client):
    resp = client.get("/cause-error")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    assert (
        "Test error logging" in data["error"]
        or "Intentional test error" in data["error"]
    )
    
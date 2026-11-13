import numpy as np

from neurosim_data.mesh import HemisphereMesh, vertex_nodes


def test_vertex_nodes_maps_annotation_names_to_connectome_order():
    labels = np.array([0, 1, 2, 2, 1])
    names = ["unknown", "precentral", "postcentral"]
    order = ["postcentral", "precentral"]
    np.testing.assert_array_equal(vertex_nodes(labels, names, order, offset=34), [-1, 35, 34, 34, 35])


def test_vertex_nodes_marks_negative_annotation_labels_as_medial_wall():
    labels = np.array([-1, 1])
    np.testing.assert_array_equal(vertex_nodes(labels, ["unknown", "insula"], ["insula"], offset=0), [-1, 0])


def test_hemisphere_mesh_serialises_to_a_fixed_binary_layout():
    mesh = HemisphereMesh(
        hemi="L",
        pial=np.arange(9, dtype=float).reshape(3, 3),
        white=np.zeros((3, 3)),
        faces=np.array([[0, 1, 2]]),
        nodes=np.array([-1, 3, 4]),
    )
    blob, layout = mesh.to_bytes(base_offset=16)
    assert layout["vertexCount"] == 3
    assert layout["faceCount"] == 1
    assert layout["pialOffset"] == 16
    assert layout["whiteOffset"] == 16 + 36
    assert layout["faceOffset"] == 16 + 72
    assert layout["nodeOffset"] == 16 + 72 + 12
    assert len(blob) == 72 + 12 + 6 + 2
    np.testing.assert_array_equal(np.frombuffer(blob, dtype="<f4", count=9), np.arange(9))
    np.testing.assert_array_equal(np.frombuffer(blob, dtype="<i2", offset=84, count=3), [-1, 3, 4])


def test_blob_is_padded_to_four_byte_alignment():
    mesh = HemisphereMesh("R", np.zeros((1, 3)), np.zeros((1, 3)), np.zeros((0, 3), dtype=int), np.array([0]))
    blob, _ = mesh.to_bytes(base_offset=0)
    assert len(blob) % 4 == 0

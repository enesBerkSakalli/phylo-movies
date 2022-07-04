export default function calculateScales(treeList) {
    let scaleList = [];
    for (let i = 0; i < treeList.length; i += 5) {
        const scale = _calculateScale(treeList[i]);
        scaleList.push({ "value": scale, "index": (i / 5) });
    }
    return scaleList;
}

function _calculateScale(node) {
    let maxRadius = 0;
    if (node.children) {
        node.children.forEach((child) => {
            let child_scale = _calculateScale(child);

            if (maxRadius < child_scale) {
                maxRadius = child_scale;
            }
        })
    }
    maxRadius = maxRadius + node.length;
    return maxRadius;
}
import tgpu from 'typegpu';
import * as d from 'typegpu/data';

// --- Types & Structs ---

const NodeStruct = d.struct({
    pos: d.vec2f,
    vel: d.vec2f,
    force: d.vec2f,
    size: d.f32,
    group: d.u32, 
});

const EdgeStruct = d.struct({
    source: d.u32,
    target: d.u32,
});

const ParamsStruct = d.struct({
    nodeCount: d.u32,
    edgeCount: d.u32,
    dt: d.f32,
    friction: d.f32,
    repulsionStrength: d.f32,
    centerStrength: d.f32,
    attractionStrength: d.f32,
    width: d.f32,
    height: d.f32,
    viewOffsetX: d.f32,
    viewOffsetY: d.f32,
    viewScale: d.f32,
});

// --- WebGPU State ---

let device: GPUDevice;
let context: GPUCanvasContext;
let root: any;
let presentationFormat: GPUTextureFormat;

let nodesBuffer: any;
let edgesBuffer: any;
let paramsBuffer: any;
let vertexBuffer: any;

let repulsionPipeline: any;
let attractionPipeline: any;
let updatePipeline: any;
let nodeRenderPipeline: any;
let edgeRenderPipeline: any;

let nodeCount = 0;
let edgeCount = 0;
let width = 1000;
let height = 800;

// Local param copy to avoid async read
let currentParams = {
    nodeCount: 0,
    edgeCount: 0,
    dt: 0.016,
    friction: 0.9,
    repulsionStrength: 20.0,
    centerStrength: 0.02,
    attractionStrength: 0.05,
    width: 1000,
    height: 800,
    viewOffsetX: 0,
    viewOffsetY: 0,
    viewScale: 1.0,
};

let nodeMetadata: any[] = []; 

// --- Shaders ---

const repulsionPass = (tgpu['~unstable'].computeFn as any)({
    in: { idx: d.builtin.globalInvocationId },
    workgroupSize: [64],
})`{
    let i = in.idx.x;
    if (i >= params.nodeCount) { return; }

    var node = nodes[i];
    var force = vec2f(0.0, 0.0);

    for (var j = 0u; j < params.nodeCount; j = j + 1u) {
        if (i == j) { continue; }
        let other = nodes[j];
        let diff = node.pos - other.pos;
        let distSq = dot(diff, diff) + 1.0;
        if (distSq < 25000.0) {
            force = force + (diff / distSq) * params.repulsionStrength;
        }
    }

    let center = vec2f(params.width / 2.0, params.height / 2.0);
    force = force + (center - node.pos) * params.centerStrength;

    nodes[i].force = force;
}`.$uses({
    params: d.ptrUniform(ParamsStruct),
    nodes: d.ptrStorage(d.arrayOf(NodeStruct, 10240)) // Use fixed size for now to avoid TypeGPU errors
});

const attractionPass = (tgpu['~unstable'].computeFn as any)({
    in: { idx: d.builtin.globalInvocationId },
    workgroupSize: [64],
})`{
    let i = in.idx.x;
    if (i >= params.edgeCount) { return; }

    let edge = edges[i];
    let source = nodes[edge.source];
    let target = nodes[edge.target];
    
    let diff = target.pos - source.pos;
    let dist = length(diff) + 0.1;
    let force = diff * (dist * params.attractionStrength);

    nodes[edge.source].force = nodes[edge.source].force + force;
    nodes[edge.target].force = nodes[edge.target].force - force;
}`.$uses({
    params: d.ptrUniform(ParamsStruct),
    nodes: d.ptrStorage(d.arrayOf(NodeStruct, 10240)),
    edges: d.ptrStorage(d.arrayOf(EdgeStruct, 20480))
});

const updatePass = (tgpu['~unstable'].computeFn as any)({
    in: { idx: d.builtin.globalInvocationId },
    workgroupSize: [64],
})`{
    let i = in.idx.x;
    if (i >= params.nodeCount) { return; }

    var node = nodes[i];
    node.vel = (node.vel + node.force * params.dt) * params.friction;
    node.pos = node.pos + node.vel * params.dt;

    // Bounds check
    if (node.pos.x < 0.0) { node.pos.x = 0.0; node.vel.x *= -0.5; }
    if (node.pos.x > params.width) { node.pos.x = params.width; node.vel.x *= -0.5; }
    if (node.pos.y < 0.0) { node.pos.y = 0.0; node.vel.y *= -0.5; }
    if (node.pos.y > params.height) { node.pos.y = params.height; node.vel.y *= -0.5; }

    nodes[i] = node;
}`.$uses({
    params: d.ptrUniform(ParamsStruct),
    nodes: d.ptrStorage(d.arrayOf(NodeStruct, 10240))
});

const nodeVertexShader = (tgpu['~unstable'].vertexFn as any)({
    in: {
        unitPos: d.vec2f,
        instanceIdx: d.builtin.instanceIndex,
    },
    out: {
        pos: d.builtin.position,
        color: d.vec4f,
    },
})`{
    let node = nodes[in.instanceIdx];
    
    let px = node.pos.x / params.width;
    let py = node.pos.y / params.height;
    
    let cx = (px * 2.0 - 1.0 + params.viewOffsetX) * params.viewScale;
    let cy = (1.0 - py * 2.0 + params.viewOffsetY) * params.viewScale;

    let screenPos = vec2f(cx, cy) + (in.unitPos * (node.size * params.viewScale) / params.width);
    
    var color = vec4f(0.8, 0.8, 0.8, 1.0);
    if (node.group == 0u) { color = vec4f(0.0, 0.44, 0.89, 1.0); } 
    if (node.group == 1u) { color = vec4f(1.0, 0.23, 0.19, 1.0); } 
    if (node.group == 2u) { color = vec4f(0.55, 0.55, 0.58, 1.0); } 
    
    return Out(vec4f(screenPos, 0.0, 1.0), color);
}`.$uses({
    params: d.ptrUniform(ParamsStruct),
    nodes: d.ptrStorage(d.arrayOf(NodeStruct, 10240))
});

const edgeVertexShader = (tgpu['~unstable'].vertexFn as any)({
    in: {
        vertexIdx: d.builtin.vertexIndex,
        instanceIdx: d.builtin.instanceIndex,
    },
    out: {
        pos: d.builtin.position,
    },
})`{
    let edge = edges[in.instanceIdx];
    let nodeIdx = select(edge.source, edge.target, in.vertexIdx == 1u);
    let node = nodes[nodeIdx];

    let px = node.pos.x / params.width;
    let py = node.pos.y / params.height;
    
    let cx = (px * 2.0 - 1.0 + params.viewOffsetX) * params.viewScale;
    let cy = (1.0 - py * 2.0 + params.viewOffsetY) * params.viewScale;

    return Out(vec4f(cx, cy, 0.0, 1.0));
}`.$uses({
    params: d.ptrUniform(ParamsStruct),
    nodes: d.ptrStorage(d.arrayOf(NodeStruct, 10240)),
    edges: d.ptrStorage(d.arrayOf(EdgeStruct, 20480))
});

const fragmentShader = (tgpu['~unstable'].fragmentFn as any)({
    in: { color: d.vec4f },
    out: d.vec4f,
})`{
    return in.color;
}`;

const edgeFragmentShader = (tgpu['~unstable'].fragmentFn as any)({
    out: d.vec4f,
})`{
    return vec4f(0.3, 0.3, 0.35, 0.5);
}`;

// --- Implementation ---

async function init(offscreen: OffscreenCanvas, w: number, h: number) {
    width = w;
    height = h;
    currentParams.width = w;
    currentParams.height = h;
    if (!navigator.gpu) return;
    
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return;
        device = await adapter.requestDevice();
        context = offscreen.getContext('webgpu') as GPUCanvasContext;
        presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        
        context.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });

        root = tgpu.initFromDevice({ device });

        const sides = 12;
        const circleVerts = [];
        for (let i = 0; i < sides; i++) {
            const angle1 = (i / sides) * Math.PI * 2;
            const angle2 = ((i + 1) / sides) * Math.PI * 2;
            circleVerts.push(d.vec2f(0, 0));
            circleVerts.push(d.vec2f(Math.cos(angle1), Math.sin(angle1)));
            circleVerts.push(d.vec2f(Math.cos(angle2), Math.sin(angle2)));
        }
        
        vertexBuffer = root.createBuffer(d.arrayOf(d.vec2f, circleVerts.length), circleVerts)
            .$usage('vertex');

        paramsBuffer = root.createBuffer(ParamsStruct, currentParams).$usage('uniform');

        startLoop();
    } catch (err) {
        console.error("Worker init failed:", err);
    }
}

function startLoop() {
    async function frame() {
        if (!device || !context || !root || nodeCount === 0 || !nodesBuffer) {
            requestAnimationFrame(frame);
            return;
        }

        try {
            if (!repulsionPipeline) repulsionPipeline = root.createComputePipeline({ compute: repulsionPass });
            if (!attractionPipeline) attractionPipeline = root.createComputePipeline({ compute: attractionPass });
            if (!updatePipeline) updatePipeline = root.createComputePipeline({ compute: updatePass });
            if (!nodeRenderPipeline) {
                nodeRenderPipeline = root.createRenderPipeline({
                    vertex: nodeVertexShader,
                    fragment: fragmentShader,
                    primitive: { topology: 'triangle-list' },
                });
            }
            if (!edgeRenderPipeline) {
                edgeRenderPipeline = root.createRenderPipeline({
                    vertex: edgeVertexShader,
                    fragment: edgeFragmentShader,
                    primitive: { topology: 'line-list' },
                });
            }

            const commandEncoder = device.createCommandEncoder();

            const repulsionPassEncoder = commandEncoder.beginComputePass();
            repulsionPipeline.with(paramsBuffer).with(nodesBuffer).dispatchWorkgroups(Math.ceil(nodeCount / 64)).execute(repulsionPassEncoder);
            repulsionPassEncoder.end();

            if (edgeCount > 0 && edgesBuffer) {
                const attractionPassEncoder = commandEncoder.beginComputePass();
                attractionPipeline.with(paramsBuffer).with(nodesBuffer).with(edgesBuffer).dispatchWorkgroups(Math.ceil(edgeCount / 64)).execute(attractionPassEncoder);
                attractionPassEncoder.end();
            }

            const updatePassEncoder = commandEncoder.beginComputePass();
            updatePipeline.with(paramsBuffer).with(nodesBuffer).dispatchWorkgroups(Math.ceil(nodeCount / 64)).execute(updatePassEncoder);
            updatePassEncoder.end();
            
            const texture = context.getCurrentTexture();
            const view = texture.createView();
            const renderPassEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [{ view, clearValue: { r: 0.01, g: 0.01, b: 0.02, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }],
            });

            // 1. Draw Edges
            if (edgeCount > 0 && edgesBuffer) {
                edgeRenderPipeline
                    .with(paramsBuffer)
                    .with(nodesBuffer)
                    .with(edgesBuffer)
                    .draw(2, edgeCount)
                    .execute(renderPassEncoder);
            }

            // 2. Draw Nodes
            const circleVertsCount = 36; 
            const vertexLayout = tgpu.vertexLayout(d.arrayOf(d.vec2f, circleVertsCount), 'vertex');
            nodeRenderPipeline
                .with(paramsBuffer)
                .with(nodesBuffer)
                .with(vertexLayout, vertexBuffer)
                .draw(circleVertsCount, nodeCount)
                .execute(renderPassEncoder);
            
            renderPassEncoder.end();
            device.queue.submit([commandEncoder.finish()]);

            // Sync back to CPU for selection (every 30 frames)
            if (Date.now() % 30 === 0) {
                const results = await nodesBuffer.read();
                for (let i = 0; i < nodeCount; i++) {
                    if (nodeMetadata[i]) {
                        nodeMetadata[i].x = results[i].pos.x;
                        nodeMetadata[i].y = results[i].pos.y;
                    }
                }
            }
        } catch (err) {
            console.error("Frame failed:", err);
        }
        
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;
    if (type === 'INIT') {
        await init(data.canvas, data.width, data.height);
    } else if (type === 'UPDATE_DATA') {
        const { nodes, edges } = data;
        nodeCount = nodes.length;
        edgeCount = edges.length;
        nodeMetadata = nodes.map((n: any) => ({ id: n.id, label: n.label, x: n.x, y: n.y }));
        
        const mappedNodes = nodes.map((n: any) => ({
            pos: d.vec2f(n.x, n.y),
            vel: d.vec2f(0, 0),
            force: d.vec2f(0, 0),
            size: n.size || 6,
            group: n.group === 'content' ? 0 : n.group === 'entity' ? 1 : n.group === 'concept' ? 2 : 3
        }));

        // Node ID to index map for edge mapping
        const idMap = new Map();
        nodes.forEach((n: any, i: number) => idMap.set(n.id, i));

        const mappedEdges = edges.map((e: any) => ({
            source: idMap.get(e.fromId) || 0,
            target: idMap.get(e.toId) || 0,
        }));

        nodesBuffer = root.createBuffer(d.arrayOf(NodeStruct, 10240), mappedNodes).$usage('storage');
        if (edgeCount > 0) {
            edgesBuffer = root.createBuffer(d.arrayOf(EdgeStruct, 20480), mappedEdges).$usage('storage');
        }
        
        currentParams.nodeCount = nodeCount;
        currentParams.edgeCount = edgeCount;
        paramsBuffer.write(currentParams);
    } else if (type === 'SET_TRANSFORM') {
        currentParams.viewOffsetX = data.x / width;
        currentParams.viewOffsetY = -data.y / height;
        currentParams.viewScale = data.k;
        paramsBuffer.write(currentParams);
    } else if (type === 'GET_NODE_AT') {
        const { x, y } = data;
        let closest = null;
        let minDist = 30; 
        for (const n of nodeMetadata) {
            const dx = n.x - x;
            const dy = n.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                closest = n;
            }
        }
        self.postMessage({ type: 'NODE_AT_RESULT', data: closest });
    }
};

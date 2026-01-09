import { tgpu } from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';

// --- Types ---
const NodeStruct = d.struct({
    pos: d.vec2f,
    vel: d.vec2f,
    mass: d.f32,
    radius: d.f32,
});

const EdgeStruct = d.struct({
    source: d.u32,
    target: d.u32,
    weight: d.f32,
});

const ParamsStruct = d.struct({
    repulsion: d.f32,
    attraction: d.f32,
    damping: d.f32,
    dt: d.f32,
    nodeCount: d.u32,
    edgeCount: d.u32,
    width: d.f32,
    height: d.f32,
});

// --- State ---
let root: any;
let device: GPUDevice;
let context: GPUCanvasContext;
let canvas: OffscreenCanvas;

let nodeBuffer: any;
let edgeBuffer: any;
let paramsBuffer: any;

let nodes: any[] = [];
let edges: any[] = [];
let nodeMetadata: any[] = [];

// --- Shaders ---

const computeLayout = (tgpu['~unstable'].computeFn as any)({
    in: { idx: d.builtin.globalInvocationId },
    workgroupSize: [64],
}).fn(({ idx }: any, nodes: any, edges: any, params: any) => {
    if (idx.x >= params.nodeCount) { return; }
    
    let node = nodes[idx.x];
    let force = d.vec2f(0.0, 0.0);

    // FIX: 0u -> 0
    for (let i = 0; i < Number(params.nodeCount); i++) {
        if (i === Number(idx.x)) { continue; }
        let other = nodes[i];
        let diff = std.sub(node.pos, other.pos);
        let distSq = std.add(std.dot(diff, diff), 1.0);
        force = std.add(force, std.mul(std.div(diff, distSq), params.repulsion));
    }

    force = std.sub(force, std.mul(node.pos, 0.01));
    node.vel = std.mul(std.add(node.vel, std.mul(force, params.dt)), params.damping);
    node.pos = std.add(node.pos, std.mul(node.vel, params.dt));
    
    nodes[idx.x] = node;
});

const vertexShader = (tgpu['~unstable'].vertexFn as any)({
    in: { idx: d.builtin.vertexIndex },
    out: {
        builtin_position: d.builtin.position,
        color: d.vec4f,
    },
}).fn(({ idx }: any, nodes: any, params: any) => {
    let nodeIdx = Math.floor(idx / 6);
    let vertIdx = idx % 6;
    let node = nodes[nodeIdx];
    
    let pos = d.vec2f(0.0, 0.0);
    if (vertIdx === 0) { pos = d.vec2f(-1.0, -1.0); }
    else if (vertIdx === 1) { pos = d.vec2f(1.0, -1.0); }
    else if (vertIdx === 2) { pos = d.vec2f(-1.0, 1.0); }
    else if (vertIdx === 3) { pos = d.vec2f(-1.0, 1.0); }
    else if (vertIdx === 4) { pos = d.vec2f(1.0, -1.0); }
    else if (vertIdx === 5) { pos = d.vec2f(1.0, 1.0); }
    
    let worldPos = std.add(node.pos, std.mul(pos, node.radius));
    let clipPos = d.vec4f(worldPos.x / (params.width / 2.0), worldPos.y / (params.height / 2.0), 0.0, 1.0);
    
    return {
        builtin_position: clipPos,
        color: d.vec4f(0.0, 0.44, 0.89, 1.0),
    };
});

const fragmentShader = (tgpu['~unstable'].fragmentFn as any)({
    in: { color: d.vec4f },
    out: d.vec4f,
}).fn(({ color }: any) => {
    return color;
});

async function init(offscreen: OffscreenCanvas) {
    if (!navigator.gpu) {
        console.error("WebGPU not supported");
        return;
    }
    
    canvas = offscreen;
    try {
        root = await tgpu.init();
        device = root.device;
        context = canvas.getContext('webgpu') as GPUCanvasContext;
        
        if (!context) {
            console.error("Failed to get WebGPU context");
            return;
        }

        context.configure({
            device,
            format: 'bgra8unorm',
            alphaMode: 'premultiplied',
        });

        nodeBuffer = root.createBuffer(d.arrayOf(NodeStruct, 10000)).$usage((tgpu as any).Storage);
        edgeBuffer = root.createBuffer(d.arrayOf(EdgeStruct, 20000)).$usage((tgpu as any).Storage);
        paramsBuffer = root.createBuffer(ParamsStruct).$usage((tgpu as any).Uniform);

        startLoop();
    } catch (err) {
        console.error("TypeGPU initialization failed:", err);
    }
}

function startLoop() {
    function frame() {
        if (!device || nodes.length === 0) {
            requestAnimationFrame(frame);
            return;
        }
        
        try {
            const computePass = root.createComputePass();
            computePass.dispatch(computeLayout, {
                nodes: nodeBuffer,
                edges: edgeBuffer,
                params: paramsBuffer,
            }, Math.ceil(nodes.length / 64));
            computePass.end();

            const renderPass = root.createRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 1, g: 1, b: 1, a: 1 },
                    storeOp: 'store',
                }]
            });
            
            renderPass.draw({
                vertex: vertexShader,
                fragment: fragmentShader,
                nodes: nodeBuffer,
                params: paramsBuffer,
            }, nodes.length * 6);
            
            renderPass.end();

            root.submit();
        } catch (err) {
            console.error("Frame failed:", err);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

self.onmessage = async (e) => {
    const { type, data } = e.data;
    
    if (type === 'INIT') {
        await init(data.canvas);
    } else if (type === 'UPDATE_DATA') {
        nodes = data.nodes;
        edges = data.edges;
        nodeMetadata = data.metadata || [];
        
        if (nodeBuffer) {
            nodeBuffer.write(nodes);
            edgeBuffer.write(edges);
            paramsBuffer.write({
                repulsion: 1000.0,
                attraction: 0.05,
                damping: 0.9,
                dt: 0.01,
                nodeCount: nodes.length,
                edgeCount: edges.length,
                width: canvas.width,
                height: canvas.height,
            });
        }
    } else if (type === 'GET_NODE_AT') {
        const { x, y } = data;
        const wx = x - canvas.width / 2;
        const wy = y - canvas.height / 2;
        
        let foundIdx = -1;
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const dx = n.pos[0] - wx;
            const dy = n.pos[1] - wy;
            if (dx*dx + dy*dy < n.radius * n.radius) {
                foundIdx = i;
                break;
            }
        }
        
        if (foundIdx !== -1) {
            self.postMessage({ type: 'NODE_FOUND', data: nodeMetadata[foundIdx] });
        }
    }
};

let gl;
let program;

// UI状态
let state = {
    depth:4,
    pointSize:2,
    colorScheme:0,
    renderMode:0, //0 POINTS,1 LINES,2 TRIANGLES
    chaosMaxPoints:10000,
    offset:[0,0],
    scale:1.0,
    isAnimPause:false,
    chaosCurrent:0,
    chaosPoints:[]
};

//鼠标拖拽
let drag = {isDown:false, lastX:0,lastY:0};

//配色
const colors = [
    [1,1,1],
    [0.2,0.4,0.9],
    [1.0,0.6,0.1]
];

// 初始化WebGL
function initGL(){
    const canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2");
    if(!gl) throw "不支持WebGL2";

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShaderSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShaderSource);
    gl.compileShader(fs);

    program = gl.createProgram();
    gl.attachShader(program,vs);
    gl.attachShader(program,fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,1);
}

// 递归细分生成三角形列表 Sierpinski
function subdivide(a,b,c,depth,outTri){
    if(depth===0){
        outTri.push(a[0],a[1], b[0],b[1], c[0],c[1]);
        return;
    }
    const ab = [(a[0]+b[0])/2, (a[1]+b[1])/2];
    const bc = [(b[0]+c[0])/2, (b[1]+c[1])/2];
    const ca = [(c[0]+a[0])/2, (c[1]+a[1])/2];
    subdivide(a,ab,ca,depth-1,outTri);
    subdivide(ab,b,bc,depth-1,outTri);
    subdivide(ca,bc,c,depth-1,outTri);
}

//混沌游戏生成点
function resetChaos(){
    //三个顶点
    const v0 = [-1.0, -0.8];
    const v1 = [ 1.0, -0.8];
    const v2 = [ 0.0,  0.8];
    state.chaosPoints = [];
    state.chaosCurrent = 0;
    let p = [Math.random()*2-1, Math.random()*1.6-0.8];
    state._chaosVerts = [v0,v1,v2];
    state._chaosStart = p;
}
function stepChaos(){
    if(state.isAnimPause) return;
    if(state.chaosCurrent >= state.chaosMaxPoints) return;
    const verts = state._chaosVerts;
    const r = Math.floor(Math.random()*3);
    const target = verts[r];
    const last = state.chaosPoints.length>0
        ? [state.chaosPoints.at(-2), state.chaosPoints.at(-1)]
        : state._chaosStart;
    const nx = (last[0]+target[0])/2;
    const ny = (last[1]+target[1])/2;
    state.chaosPoints.push(nx, ny);
    state.chaosCurrent++;
}

//绘制
function render(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    const posLoc = gl.getAttribLocation(program,"aPosition");
    const offLoc = gl.getUniformLocation(program,"uOffset");
    const scaleLoc = gl.getUniformLocation(program,"uScale");
    const colorLoc = gl.getUniformLocation(program,"uColor");

    gl.uniform2fv(offLoc, state.offset);
    gl.uniform1f(scaleLoc, state.scale);
    gl.uniform3fv(colorLoc, colors[state.colorScheme]);

    //递归细分几何体
    const triData = [];
    const A = [-1.0,-0.8], B=[1.0,-0.8], C=[0.0,0.8];
    subdivide(A,B,C, state.depth, triData);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    if(state.renderMode===0){
        //POINTS 使用混沌游戏点
        stepChaos();
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.chaosPoints), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(posLoc);
        gl.drawArrays(gl.POINTS,0, state.chaosPoints.length/2);
    }else if(state.renderMode===1){
        //LINES
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triData), gl.STATIC_DRAW);
        gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(posLoc);
        gl.drawArrays(gl.LINES, 0, triData.length/2);
    }else if(state.renderMode===2){
        //TRIANGLES
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triData), gl.STATIC_DRAW);
        gl.vertexAttribPointer(posLoc,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(posLoc);
        gl.drawArrays(gl.TRIANGLES,0, triData.length/2);
    }
    requestAnimationFrame(render);
}

//绑定UI事件
function bindUI(){
    const depthIn = document.getElementById("depth");
    depthIn.oninput = ()=>{
        state.depth = Number(depthIn.value);
        document.getElementById("depthVal").textContent = state.depth;
    };

    const psIn = document.getElementById("pointSize");
    psIn.oninput = ()=>{
        state.pointSize = Number(psIn.value);
        document.getElementById("psVal").textContent = state.pointSize;
    };

    document.getElementById("colorScheme").onchange = e=>{
        state.colorScheme = Number(e.target.value);
    };

    document.querySelectorAll("[data-mode]").forEach(btn=>{
        btn.onclick=()=>{
            state.renderMode = Number(btn.dataset.mode);
            if(state.renderMode===0) resetChaos();
        }
    });

    const ccIn = document.getElementById("chaosCount");
    ccIn.oninput = ()=>{
        state.chaosMaxPoints = Number(ccIn.value);
        document.getElementById("ccVal").textContent = state.chaosMaxPoints;
        resetChaos();
    };

    //键盘
    window.onkeydown = e=>{
        if(e.key==="1") {state.renderMode=0;resetChaos();}
        if(e.key==="2") state.renderMode=1;
        if(e.key==="3") state.renderMode=2;
        if(e.key===" ") {
            e.preventDefault();
            state.isAnimPause = !state.isAnimPause;
        }
    };

    const canvas = document.getElementById("glcanvas");
    canvas.onmousedown = e=>{
        drag.isDown=true;
        drag.lastX = e.clientX; drag.lastY = e.clientY;
    };
    window.onmousemove = e=>{
        if(!drag.isDown) return;
        const dx = (e.clientX - drag.lastX)/400.0;
        const dy = -(e.clientY - drag.lastY)/300.0;
        state.offset[0] += dx;
        state.offset[1] += dy;
        drag.lastX = e.clientX; drag.lastY = e.clientY;
    };
    window.onmouseup = ()=>drag.isDown=false;
    canvas.onwheel = e=>{
        e.preventDefault();
        const s = e.deltaY>0?0.95:1.05;
        state.scale *= s;
    };
}

window.onload = ()=>{
    initGL();
    bindUI();
    resetChaos();
    render();
};
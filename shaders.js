const vertexShaderSource = `#version 300 es
precision mediump float;
in vec2 aPosition;
uniform vec2 uOffset;
uniform float uScale;
void main(){
    vec2 p = aPosition * uScale + uOffset;
    gl_Position = vec4(p, 0.0, 1.0);
    gl_PointSize = 3.0;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 fragColor;
void main(){
    fragColor = vec4(uColor,1.0);
}
`;
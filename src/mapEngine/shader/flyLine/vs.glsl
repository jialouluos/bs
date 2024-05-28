attribute vec2 self_uv;
varying vec2 v_uv;
varying vec3 v_color;
varying float v_pickFlag;
attribute vec3 color;
attribute float pickFlag;
void main() {
    vec4 Mvposition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * Mvposition;
    v_uv = self_uv;
    v_color = color;
    v_pickFlag = pickFlag;
}
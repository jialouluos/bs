precision mediump float;
uniform float u_Time;
varying float v_pickFlag;
uniform float u_Speed;
uniform vec3 u_PickColor;
uniform vec3 u_PickColor2;
varying vec2 v_uv;
varying vec3 v_color;
void main() {
    if(v_pickFlag > 0.5 && v_pickFlag < 1.0) {
        gl_FragColor = vec4(u_PickColor, 1.0);
    } else if(v_pickFlag > 1.5) {
        gl_FragColor = vec4(u_PickColor2, 1.0);
    } else {
        float opacity = fract(v_uv.x + u_Time * u_Speed);

        if(opacity < 0.2) {
            discard;
        }
        gl_FragColor = vec4(v_color * opacity, 1.0);
    }

}
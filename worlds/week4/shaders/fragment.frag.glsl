#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;   // TIME, IN SECONDS
in vec3 vPos;          // POSITION IN IMAGE
out vec4 fragColor;    // RESULT WILL GO HERE

const int NS = 5; // Number of uShapes in the scene
const int NL = 3; // Number of light sources in the scene
const float eps = 1.e-7; 
uniform vec3 eye ; 
uniform vec3 screen_center; 

struct Shape{
    // float r;
    int n_p;
    mat4 surf[8];
    mat4 trans;
    mat4 itrans;
};


struct Material{
    vec3 ambient; 
    vec3 diffuse; 
    vec3 specular; 
    float power;
    vec3 reflectc;
    float refraction;
    vec3 transparent;
}; 

struct Ray{
    vec3 src; 
    vec3 dir; 
}; 

struct Light{
    vec3 rgb; 
    vec3 src; 
}; 

uniform Shape uShapes[NS];
uniform Material uMaterials[NS];
uniform Light lights[NL];


Ray get_ray(vec3 p_src, vec3 p_dest){
    Ray ret; 
    ret.src = p_src; 
    ret.dir = normalize(p_dest - p_src); 
    return ret; 
}


vec3 get_normal(Shape s, vec3 pos, int idx) {
    mat4 sf = s.surf[idx];
    vec4 p = vec4(pos, 1) * transpose(s.itrans);
    // vec4 p = vec4(pos, 1);
    return normalize( vec3( 2.*sf[0][0]*p.x+sf[0][1]*p.y+sf[0][2]*p.z+sf[0][3],
                            2.*sf[1][1]*p.y+sf[1][2]*p.z+sf[1][3],
                            2.*sf[2][2]*p.z+sf[2][3] ) );
}

// return vec4(tmin, tmax, idx1, idx2)
// idx1 => idx for tmin; idx2 => idx for tmax

vec4 intersect(Ray r,  Shape s){
    float idx1 = -1., idx2 = -1.; 
    float tmin = -10000., tmax = 10000.;

    vec4 src = vec4(r.src, 1) * transpose(s.itrans);
    // vec4 src = vec4(r.src, 1);

    float wx = r.dir.x, wy = r.dir.y, wz = r.dir.z; 
    float vx = src[0], vy = src[1], vz = src[2]; 

    for (int i = 0; i < s.n_p; i++) {
        mat4 sf = s.surf[i];

        float A = sf[0][0]*wx*wx + sf[0][1]*wx*wy + sf[0][2]*wx*wz + 
                  sf[1][1]*wy*wy + sf[1][2]*wy*wz + 
                  sf[2][2]*wz*wz;
        float B = sf[0][0]*(vx*wx + vx*wx) + sf[0][1]*(vx*wy + vy*wx) + sf[0][2]*(vx*wz + vz*wx) + 
                  sf[0][3]*wx + sf[1][1]*(vy*wy + vy*wy) + sf[1][2]*(vy*wz + vz*wy) + sf[1][3]*wy +
                  sf[2][2]*(vz*wz + vz*wz) + sf[2][3]*wz;
        float C = sf[0][0]*vx*vx + sf[0][1]*vx*vy + sf[0][2]*vx*vz + sf[0][3]*vx + 
                  sf[1][1]*vy*vy + sf[1][2]*vy*vz + sf[1][3]*vy + 
                  sf[2][2]*vz*vz + sf[2][3]*vz + sf[3][3];

        if (abs(A) > 1.e-7) {

            float delta = B*B - 4.*A*C;

            if (delta < 0.) {
                return vec4 (-1., -2. , -1., -1.);
            }
            else if (delta > 0.) {
                float r1 = (-B - sqrt(delta)) / (2.*A), r2 = (-B + sqrt(delta)) / (2.*A);
                float t1 = min(r1, r2), t2 = max(r1, r2);
                float outside = dot(src, src * transpose(sf));

                // if outside
                if (outside > 0.) {
                    if (t1 < 0. && t2 < 0.) {
                        return vec4(10000., -10000., -1., -1.);
                    }
                    else {
                        if (t1 > 0. && t1 > tmin) {
                            tmin = t1;
                            idx1 = float(i);
                        }
                        if (t2 > 0. && t2 < tmax) {
                            tmax = t2;
                            idx2 = float(i);
                        }
                    }
                }
                else {
                    if (t2 > 0. && t2 < tmax) {
                        tmax = t2;
                        idx2 = float(i);
                    }
                }
            }
            else {
                float t = -B / (2.*A);
                // still need outside if-cond 
                float outside = dot(src, src * transpose(sf));
                // if outside
                if (outside > 0.) {
                    if (t < 0.) {
                        return vec4(10000., -10000., -1., -1.);
                    }
                    if (t > tmin) {
                        tmin = t;
                        idx1 = float(i);
                    }
                }
                else {
                    if (t < tmax) {
                        tmax = t;
                        idx2 = float(i);
                    }                
                }
            }
        }
        // A == 0.
        else {
            if(B==0.) continue;
            float outside = dot(src, src * transpose(sf));
            float t = -C/B;
            if (outside > 1.e-7) {
                    if (t < 0.) {
                        return vec4(-1., -2., -1., -1.);
                    }
                    if (t > 0. && t > tmin) {
                        tmin = t;
                        idx1 = float(i);
                    }
                }
                else {
                    if (t > 0. && t < tmax) {
                        tmax = t;
                        idx2 = float(i);
                    }                
                }
        }
    }

    if (idx1 <= -1. && idx2 <= -1.) {
        return vec4(10000., -10000., idx1, idx2);
    }
    return vec4(tmin, tmax, idx1, idx2);

}

bool hidden_by_shape(Light l){
    Ray ray = get_ray(eye, l.src); 
    for(int i = 0; i < NS; i++){
        
        vec4 t = intersect(ray, uShapes[i]); 
        if(t[1] > t[0] && t[0] > 0. && t[0] < length(l.src - eye)){
            return true; 
        }
        
    }
    return false; 
}

Ray reflect_ray(Ray rin, vec3 norm){
    Ray ret; 
    ret.src = rin.src; 
    ret.dir = normalize(2.*dot(norm, rin.dir)*norm - rin.dir); 
    return ret; 
}

Ray refract_ray(Ray rin, vec3 norm, float refraction) {
    Ray ret; 
    ret.src = rin.src + 0.0001 * norm;
    vec3 wn = dot(rin.dir, norm) * norm;
    vec3 ws = rin.dir - wn;

    vec3 wsp = -ws / refraction;
    vec3 wnp = -sqrt(1. - dot(wsp, wsp)) * norm;
    ret.dir = wsp + wnp;
    return ret;
}

Ray refract_out_ray(Ray r, Shape s, float refraction, int idx_p) {
    // 2 time refracion: in and out.
    // input: ray shoot toward the surface(but reverse the direction, i.e., outward)
    // output: ray outward the surface(keep the same direction)
    vec3 norm = get_normal(s, r.src, idx_p);
    Ray rin = refract_ray(r, norm, refraction);
    vec4 t = intersect(rin, s);
    Ray ret;
    if (t[1] >= t[0] && t[1] > 0. && t[0] > 0.) {
        // has intersection
        float t1 = t[1];
        vec3 out_point = rin.src + t1*rin.dir;
        vec3 norm2 = get_normal(s, out_point, int(t[3]));
        Ray ro;
        ro.src = out_point;
        ro.dir = -rin.dir;
        ret = refract_ray(ro, -norm2, 1./refraction);
    }
    return ret;
}

bool is_in_shadow(vec3 pos, vec3 norm, Light light){
    
    pos = pos + .0001*norm; 
    bool ret = false; 
    Ray ray_l = get_ray(pos, light.src); 
    for(int j = 0; j < NS; j++){
        vec4 t = intersect(ray_l, uShapes[j]);
        if(t[1] > t[0] && t[0] > 0.){
            return true; 
        }
    }
    return ret; 
}

// inter_point: the intersect point 
// index: index of shape
vec3 phong(vec3 inter_point, int index, int idx_p) {
    vec3 N=get_normal(uShapes[index], inter_point, idx_p);
    vec3 color=uMaterials[index].ambient;
    for(int j=0;j<NL;j++){
        if(!is_in_shadow(inter_point,N,lights[j])){
            Ray L = get_ray(inter_point,lights[j].src);
            Ray E = get_ray(inter_point,eye);
            Ray R = reflect_ray(L,N);
            color += lights[j].rgb*(uMaterials[index].diffuse*max(0.,dot(N,L.dir)));
            // That is where the bug is.
            // Something in Pow. If specular  >  =  10.,  it will overflow.
            // float s  =  max(0.,  pow(dot(E.dir,  R.dir),  uShapes[index].specular[3]) );
            float s;
            float er = dot(E.dir,R.dir);
            if(er > 0.){
                s = max(0.,exp(uMaterials[index].power*log(er)));
            }
            else{
                s = 0.;
            }
            color += lights[j].rgb*uMaterials[index].specular*s;
        }
    }
    return color;
}

vec3 ray_tracing(){
    vec3 color = vec3(0., 0., 0.); 
    Ray ray = get_ray(eye, screen_center + vec3(vPos.xy, 0)); 
    for(int i = 0; i < NL; i++){
        // show lights
        if(dot(normalize(lights[i].src - ray.src), ray.dir) > .99999){
            if(hidden_by_shape(lights[i])) continue; 
            color = lights[i].rgb; 
            return color; 
        }
    }
    
    float t_min = 10000.; 
    int index =  -1; 
    int idx_p = -1;
    vec4 t;
    float tmp = 10001.;
    for(int i = 0; i < NS; i++){
        t = intersect(ray, uShapes[i]); 

        if (t[1] >= t[0]) {
            if(t[0] >= 0.){
                tmp = t[0];
            }
            if(tmp < t_min) {
                t_min = tmp;
                index = i;
                idx_p = int(t[2]);
            }
        }
    }

    if(index >  - 1){
        // find the first intersect
        vec3 inter_point = ray.src + t_min*ray.dir;
        color = phong(inter_point, index, idx_p);
        
        vec3 N = get_normal(uShapes[index], inter_point, idx_p);
        Ray r_in;
        r_in.dir = -ray.dir;
        r_in.src = inter_point + N*0.00001;

        // First level reflection.
        Ray r_out = reflect_ray(r_in, N);
        vec4 tr;
        float tmpr = 10001.;
        float t_minr = 10000.; 
        int idx_pr = -1;
        int indexr = -1;
        for(int j = 0; j < NS; j++){
            tr = intersect(r_out, uShapes[j]); 
            if (tr[1] >= tr[0] && tr[0] >= 0.) {
                tmpr = tr[0];
                if(tmpr < t_minr) {
                    t_minr = tmpr;
                    indexr = j;
                    idx_pr = int(tr[2]);
                }
            }
        }
            
        if(indexr > -1) {
            vec3 inter_point_r = r_out.src + t_minr*r_out.dir; 
            color += uMaterials[index].reflectc * phong(inter_point_r, indexr, idx_pr);
        }

        // First level refraction.
        Ray ra = refract_out_ray(r_in, uShapes[index], uMaterials[index].refraction, idx_p);
        vec4 ta;
        float tmpa = 10001.;
        float t_mina = 10000.; 
        int idx_pa = -1;
        int indexa = -1;

        for(int j = 0; j < NS; j++){
            ta = intersect(ra, uShapes[j]); 
            if (ta[1] >= ta[0] && ta[0] >= 0.) {
                tmpa = ta[0];
                if(tmpa < t_mina) {
                    t_mina = tmpa;
                    indexa = j;
                    idx_pa = int(ta[2]);
                }
                
            }
        }

        if(indexa > -1) {
            vec3 inter_point_a = ra.src + t_mina*ra.dir; 
            color += uMaterials[index].transparent * phong(inter_point_a, indexa, idx_pa);
        }
    }
    
    return color; 
}

void main() {
    // vec3 color = .5 * cos(10. * vPos);
    // // HIGHLIGHT CURSOR POSITION WHILE MOUSE IS PRESSED
    // if (uCursor.z > 0. && min(abs(uCursor.x - vPos.x), abs(uCursor.y - vPos.y)) < .01)
    //       color *= 2.;
    vec3 color = ray_tracing(); 
    fragColor = vec4(color, 1.0);
}



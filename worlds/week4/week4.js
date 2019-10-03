"use strict"

let cursor;

// I HAVE IMPLEMENTED inverse() FOR YOU. FOR HOMEWORK, YOU WILL STILL NEED TO IMPLEMENT:
// identity(), translate(x,y,z), rotateX(a), rotateY(a) rotateZ(a), scale(x,y,z), multiply(A,B)

let inverse = src => {
    let dst = [], det = 0, cofactor = (c, r) => {
       let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
       return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                   - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                   + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
    }
    for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
    for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
    for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
    return dst;
  }

// I implement these method in class Mat

class Mat{
    constructor(height, width, v=0.0) {
        this.w = width;
        this.h = height;
        this._mat = [];
        for(var i = 0; i < this.h * this.w; i++) {
            this._mat[i] = v;
        }
    }

    size() { 
        return [this.h, this.w];
    }

    elem(i, j) {
        if(i >= 0 && i < this.h && j >= 0 && j < this.w) {
            var idx = j*this.h + i;
            return this._mat[idx];
        }
    }

    set(i, j, v) { 
        if(i >= 0 && i < this.h && j >= 0 && j < this.w) {
            var idx = j*this.h + i;
            this._mat[idx] = v;
        }
    }

    transpose() { 
        let ret = new Mat(this.w, this.h, 0.0);
        for (var i = 0; i < this.h; i++) {
            for(var j = 0; j < this.w; j++) {
                ret.set(j, i, this.elem(i, j));
            }
        }
        return ret;
    }

    t() { 
        return this.transpose();
    }

    print() { 
        var str = "";
        for(var i = 0; i < this.h; i++) {
            for(var j = 0; j < this.w; j++) {
                str = str + this.elem(i, j) + " ";       
            }
            str += "\n";
        }
        console.log(str);
    }

    // col by col
    toList() {
        return this._mat;;
    }

    // col by col
    static fromList(height, width, vector) {
        if (vector.length != height * width) {
            throw "Dimensions do not match!";
        }
        let ret = new Mat(height, width, 0.);
        ret._mat = vector;
        return ret;
    }

    static diag(n, vector) {
        if (vector.length != n) {
            throw "Dimensions do not match!";
        }
        let ret = new Mat(n, n, 0.);
        for(var i = 0; i < n; i++) {
            ret.set(i, i, vector[i]);
        }
        return ret;
    }


    static mat_add(A, B) {
        if(A.w != B.w || A.h != B.h) {
            throw "Dimensions do not match!";
        }

        let C = new Mat(A.h, B.w, 0.0);
        for(var i = 0; i < A.h; ++i) {
            for (var j = 0; j < B.w; ++j) {
                C.set(i, j, A.elem(i, j) + B.elem(i, j));
            }
        }
        return C;
    }

    static multiply(A, B) {
        if(A.w != B.h) {
            throw "Dimensions do not match!";
        }
    
        let C = new Mat(A.h, B.w, 0.0);
    
        for(var i = 0; i < A.h; ++i) {
            for (var j = 0; j < B.w; ++j) {
                var tmp = 0.0;
                for (var k = 0; k < A.w; ++k) {
                    tmp += A.elem(i, k) * B.elem(k, j);
                }
                C.set(i, j, tmp);
            }
        }
        return C;
    }

    inv() {
        let ret = new Mat(this.h, this.w, 0.);
        ret._mat = inverse(this._mat);
        return ret;
    }

    static identity() {
        return Mat.diag(4, [1, 1, 1, 1]);
    }

    static translate(x, y, z) {
        let trans = Mat.identity();
        trans.set(0, 3, x);
        trans.set(1, 3, y);
        trans.set(2, 3, z);
        return trans;
    }

    static scale(x, y, z) {
        return Mat.diag(4, [x, y, z, 1]);
    }

    static perspective(x, y, z, w) {
        let trans = Mat.identity();
        trans.set(3, 0, x);
        trans.set(3, 1, y);
        trans.set(3, 2, z);
        trans.set(3, 3, w);
        return trans;
    }

    static rotateX(th) {
        var c = Math.cos(th);
        var s = Math.sin(th);

        let trans = Mat.diag(4, [1, c, c, 1]);
        trans.set(1, 2, -s);
        trans.set(2, 1, s);
        return trans;
    }

    static rotateY(th) {
        var c = Math.cos(th);
        var s = Math.sin(th);

        let trans = Mat.diag(4, [c, 1, c, 1]);
        trans.set(0, 2, s);
        trans.set(2, 0, -s);
        return trans;
    }

    static rotateZ(th) {
        var c = Math.cos(th);
        var s = Math.sin(th);

        let trans = Mat.diag(4, [c, c, 1, 1]);
        trans.set(0, 1, -s);
        trans.set(1, 0, s);
        return trans;
    }

}


async function setup(state) {
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },
        {
            key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true
        },      
    ]);

    if (!libSources) {
        throw new Error("Could not load shader library");
    }

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        
                        /*
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + "\n#line 1 1\n" + 
                                    libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                    stageCode.substring(hdrEndIdx + 1);
                        console.log(output[i]);
                        */
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);

                        console.log(output[i]);
                    }
                }

                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                state.program = program;

		cursor = ScreenCursor.trackCursor(MR.getCanvas());

                gl.useProgram(program);

                state.uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');

                // My data 
                state.eyeLoc           = gl.getUniformLocation(program, 'eye');
                state.screenCenterLoc           = gl.getUniformLocation(program, 'screen_center');
                
                state.uMaterialsLoc = []
                for (var i = 0; i < 4; i++) {
                    state.uMaterialsLoc[i] = {};
                    state.uMaterialsLoc[i].diffuse  = gl.getUniformLocation(program, 'uMaterials[' + i + '].diffuse');
                    state.uMaterialsLoc[i].ambient  = gl.getUniformLocation(program, 'uMaterials[' + i + '].ambient');
                    state.uMaterialsLoc[i].specular = gl.getUniformLocation(program, 'uMaterials[' + i + '].specular');
                    state.uMaterialsLoc[i].power    = gl.getUniformLocation(program, 'uMaterials[' + i + '].power');
                    state.uMaterialsLoc[i].reflectc = gl.getUniformLocation(program, 'uMaterials[' + i + '].reflectc');
                    state.uMaterialsLoc[i].refraction = gl.getUniformLocation(program, 'uMaterials[' + i + '].refraction');
                    state.uMaterialsLoc[i].transparent = gl.getUniformLocation(program, 'uMaterials[' + i + '].transparent');
                }
                
                state.uShapesLoc = [];
                for (var i = 0; i <4; i++) {
                    state.uShapesLoc[i] = {};
                    state.uShapesLoc[i].center = gl.getUniformLocation(program, 'uShapes[' + i + '].center');
                    state.uShapesLoc[i].r = gl.getUniformLocation(program, 'uShapes[' + i + '].r');
                    state.uShapesLoc[i].type = gl.getUniformLocation(program, 'uShapes[' + i + '].type');
                    state.uShapesLoc[i].n_p = gl.getUniformLocation(program, 'uShapes[' + i + '].n_p');
                    state.uShapesLoc[i].planeLoc = []
                    state.uShapesLoc[i].surfLoc = []
                    for (var j = 0; j < 8; j++) {
                        state.uShapesLoc[i].surfLoc[j] = gl.getUniformLocation(program, 'uShapes[' + i + '].surf[' + j + ']');
                        state.uShapesLoc[i].planeLoc[j] = gl.getUniformLocation(program, 'uShapes[' + i + '].plane[' + j + ']');
                    }
                }

                state.lightsLoc = [];                
                for (var i = 0; i < 3; i++) {
                    state.lightsLoc[i] = {};
                    state.lightsLoc[i].src = gl.getUniformLocation(program, 'lights[' + i + '].src');
                    state.lightsLoc[i].rgb = gl.getUniformLocation(program, 'lights[' + i + '].rgb');
                }
            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }


    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

    // Assign aPos attribute to each vertex
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
}



// NOTE: t is the elapsed time since system start in ms, but
// each world could have different rules about time elapsed and whether the time
// is reset after returning to the world
function onStartFrame(t, state) {
    // (KTR) TODO implement option so a person could pause and resume elapsed time
    // if someone visits, leaves, and later returns
    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    let cursorValue = () => {
       let p = cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    tStart = state.tStart;

    let now = (t - tStart);
    // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
    state.time = now;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let time = now / 1000;

    gl.uniform3fv(state.uCursorLoc     , cursorValue());
    gl.uniform1f (state.uTimeLoc       , time);

    // My data
    gl.uniform3fv(state.eyeLoc, [0., 0., 5.]);
    gl.uniform3fv(state.screenCenterLoc, [0., 0., 2.5]);

    gl.uniform3fv(state.uMaterialsLoc[0].ambient , [0.,.1,.1]);
    gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [0.,.5,.5]);
    gl.uniform3fv(state.uMaterialsLoc[0].specular, [0.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[0].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[0].reflectc , [0.5,0.5,0.5]);
    gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
    gl.uniform1f (state.uMaterialsLoc[0].refraction   , 1.5);

    gl.uniform3fv(state.uMaterialsLoc[1].ambient , [0.0314, 0.098, 0.0]);
    gl.uniform3fv(state.uMaterialsLoc[1].diffuse , [0.05, 0.25, 0.0]);
    gl.uniform3fv(state.uMaterialsLoc[1].specular, [1.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[1].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[1].reflectc , [0.5, 0.5, 0.5]);
    gl.uniform3fv(state.uMaterialsLoc[1].transparent, [0.5, 0.5, 0.5]);
    gl.uniform1f (state.uMaterialsLoc[1].refraction   , 1.5);

    gl.uniform3fv(state.uMaterialsLoc[2].ambient , [.1,.1,0.]);
    gl.uniform3fv(state.uMaterialsLoc[2].diffuse , [.4,.1,0.3]);
    gl.uniform3fv(state.uMaterialsLoc[2].specular, [1.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[2].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[2].reflectc , [0.4, 0.4, 0.4]);
    gl.uniform3fv(state.uMaterialsLoc[2].transparent, [0.4, 0.4, 0.4]);
    gl.uniform1f (state.uMaterialsLoc[2].refraction   , 1.5);

    gl.uniform3fv(state.uMaterialsLoc[3].ambient , [0.0, 0.25, 0.5]);
    gl.uniform3fv(state.uMaterialsLoc[3].diffuse , [0.098, 0.2549, 0.4]);
    gl.uniform3fv(state.uMaterialsLoc[3].specular, [1.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[3].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[3].reflectc , [0.4, 0.4, 0.4]);
    gl.uniform3fv(state.uMaterialsLoc[3].transparent, [0.4, 0.4, 0.4]);
    gl.uniform1f (state.uMaterialsLoc[3].refraction   , 2.0);

    gl.uniform3fv(state.uShapesLoc[0].center, [1.0*Math.cos(2.*time), 1.0*Math.sin(2.*time), -3.*Math.sin(time)]);
    gl.uniform1f (state.uShapesLoc[0].r, 0.6);
    gl.uniform1i (state.uShapesLoc[0].type, 0);
    gl.uniform1i (state.uShapesLoc[0].n_p, 0);

    gl.uniform3fv(state.uShapesLoc[1].center, [-.5, 1.2, -0.4]);
    gl.uniform1f (state.uShapesLoc[1].r, 0.7);
    gl.uniform1i (state.uShapesLoc[1].type, 0);
    gl.uniform1i (state.uShapesLoc[1].n_p, 0);

    var r3 = 1.0 / Math.sqrt(3);
    var r = 0.2;

    gl.uniform3fv(state.uShapesLoc[2].center, [-1.*Math.sin(2.*time), -1.*Math.cos(2.*time), 1.]);
    gl.uniform1f (state.uShapesLoc[2].r, 0.3);
    gl.uniform1i (state.uShapesLoc[2].type, 1);
    gl.uniform1i (state.uShapesLoc[2].n_p, 8);

    var ry =  Mat.rotateY(time);
    var rx =  Mat.rotateX(time);
    var translate = Mat.translate(-1.*Math.sin(2.*time), -1.*Math.cos(2.*time), 1.);
    var trans = Mat.multiply(rx, ry);
    trans = Mat.multiply(translate, trans);
    var inv_trans = trans.inv();
    var tmp;

    tmp = Mat.fromList(1, 4, [-r3,-r3,-r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[0], tmp.toList());

    tmp = Mat.fromList(1, 4, [-r3,-r3,+r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[1], tmp.toList());

    tmp = Mat.fromList(1, 4, [-r3,+r3,-r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[2], tmp.toList());

    tmp = Mat.fromList(1, 4, [-r3,+r3,+r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[3], tmp.toList());

    tmp = Mat.fromList(1, 4, [+r3,-r3,-r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[4], tmp.toList());

    tmp = Mat.fromList(1, 4, [+r3,-r3,+r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[5], tmp.toList());

    tmp = Mat.fromList(1, 4, [+r3,+r3,-r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[6], tmp.toList());

    tmp = Mat.fromList(1, 4, [+r3,+r3,+r3,-r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[2].planeLoc[7], tmp.toList());



    gl.uniform3fv(state.uShapesLoc[3].center, [0.6*Math.cos(time), 0., 0.6*Math.sin(time) + 0.6]);
    gl.uniform1f (state.uShapesLoc[3].r, 0.3);
    gl.uniform1i (state.uShapesLoc[3].type, 1);
    gl.uniform1i (state.uShapesLoc[3].n_p, 6);

    var translate = Mat.translate(0.6*Math.cos(time), 0., 0.6*Math.sin(time) + 0.6);
    var trans = Mat.multiply(rx, ry);
    trans = Mat.multiply(translate, trans);
    var inv_trans = trans.inv();

    tmp = Mat.fromList(1, 4, [1. , 0., 0., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[0], tmp.toList());

    tmp = Mat.fromList(1, 4, [-1. , 0., 0., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[1], tmp.toList());

    tmp = Mat.fromList(1, 4, [0. , 1., 0., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[2], tmp.toList());

    tmp = Mat.fromList(1, 4, [0. , -1., 0., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[3], tmp.toList());

    tmp = Mat.fromList(1, 4, [0. , 0., 1., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[4], tmp.toList());

    tmp = Mat.fromList(1, 4, [0. , 0., -1., -r]);
    tmp = Mat.multiply(tmp, inv_trans);
    gl.uniform4fv(state.uShapesLoc[3].planeLoc[5], tmp.toList());


    gl.uniform3fv(state.lightsLoc[0].src, [2.*Math.sin(time), 2.*Math.cos(time), -.5]);
    gl.uniform3fv(state.lightsLoc[0].rgb, [1., 1., 1.]);

    gl.uniform3fv(state.lightsLoc[1].src, [-1.5*Math.cos(time), 0., 1.5*Math.sin(time)]);
    gl.uniform3fv(state.lightsLoc[1].rgb, [1., 1., 1.]);

    gl.uniform3fv(state.lightsLoc[2].src, [0., 1.*Math.cos(time), 1.*Math.sin(time)]);
    gl.uniform3fv(state.lightsLoc[2].rgb, [1., 1., 1.]);

    gl.enable(gl.DEPTH_TEST);
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
    const sec = state.time / 1000;

    const my = state;
  
    gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
    gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week4',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}

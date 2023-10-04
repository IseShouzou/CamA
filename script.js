window.onload = function(){

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");

    canvas.setAttribute("width", window.innerWidth )
    canvas.setAttribute("height", window.innerHeight )

    let fovy = 45.0;

    //let pnts = [ [ 0.5, -0.5,  0.1 ],
    //             [ 0.5,  0.5,  0.1 ],
    //             [ 0.5,  0.5,  0.5 ],
    //             [ 0.5, -0.5,  0.5 ] ];

    let pnts = [ [ 0.5, -0.1,  -0.07 ],
                 [ 0.5,  0.1,  -0.05 ],
                 [ 0.5,  0.1,   0.05 ],
                 [ 0.5, -0.1,   0.07 ] ];

    let phi = 0.0;
    let the = 0.0;
    let psi = 0.0;

    let sliderA = document.getElementById("SliderAlpha");
    let sliderB = document.getElementById("SliderBeta");
    let sliderC = document.getElementById("SliderGamma");

    let alp = sliderA.value;
    let bet = sliderB.value;
    let gam = sliderC.value;

    sliderA.addEventListener("input", function(e){
        //alp= sliderA.value;
    })

    sliderB.addEventListener("input", function(e){
        //bet = sliderB.value;
    })

    sliderC.addEventListener("input", function(e){
        //gam = sliderC.value;
    })

    window.addEventListener("deviceorientation", function(e){
        alp = ( e.alpha || 0);
        bet = ( e.beta  || 0);
        gam = ( e.gamma || 0);
    });

    window.addEventListener( 'resize', ()=>{
        //console.log( 'resize' )
        canvas.setAttribute("width", window.innerWidth );
        canvas.setAttribute("height", window.innerHeight );

} )


    function calcDCM(){

        let alpRad = alp * Math.PI / 180.0;
        let betRad = bet * Math.PI / 180.0;
        let gamRad = gam * Math.PI / 180.0

        let ca = Math.cos( alpRad );
        let sa = Math.sin( alpRad );
        let cb = Math.cos( betRad );
        let sb = Math.sin( betRad );
        let cg = Math.cos( gamRad );
        let sg = Math.sin( gamRad );

        let m11 =   cg * ca - sg * sb * sa;
        let m21 = - cb * sa ;
        let m31 =   sg * ca + cg * sb * sa;

        let m12 =  cg * sa + sg * sb * ca;
        let m22 =  cb * ca ;
        let m32 =  sg * sa - cg * sb * ca ;

        let m13 = - sg * cb;
        let m23 =   sb;
        let m33 =   cg * cb;

        // vertical
        //let mat = [ [ -m32, -m31,  m33 ],
        //            [  m12,  m11, -m13 ],
        //            [ -m22, -m21,  m23 ] ];
        // horizontal
        //let mat = [ [ -m31, m32, m33 ],
        //            [ -m21, m22, m23 ],
        //            [ -m11, m12, m13 ] ];

        let mat = [ [ -m31, -m32, -m33 ],
                    [  m11,  m12,  m13 ],
                    [ -m21, -m22, -m23 ] ];

        phi = 180.0 / Math.PI * Math.atan2(   mat[1][2], mat[2][2] );
        the = 180.0 / Math.PI * Math.atan2( - mat[0][2], Math.sqrt( mat[1][2] * mat[1][2] + mat[2][2] * mat[2][2]) );
        psi = 180.0 / Math.PI * Math.atan2(   mat[0][1], mat[0][0] );

        return mat;

    }

    let count = 0;

    navigator.mediaDevices
        .getUserMedia({ audio: false, video: { facingMode: "environment" } })
        .then(stream => {

            let imageCapture = new ImageCapture( stream.getVideoTracks()[0] );

            setInterval(() => {

                imageCapture.grabFrame()
                    .then((imageBitmap) => {

                        count += 1;

                        let W = canvas.width;
                        let H = canvas.height;

                        //console.log( 'W, H  :  ',W, H );

                        let e = H / 2.0 / Math.tan( fovy / 2.0 * Math.PI / 180.0 );
                        let dcm = calcDCM();
                        let coeff = [ [   0.0        , - 2.0 * e / H ],
                                      [   0.0        ,   2.0 * e / H ],
                                      [ - 2.0 * e / W,   0.0         ],
                                      [   2.0 * e / W,   0.0         ] ];

                        let curPnts = [];
                        for( var p of pnts ){
                            curPnts.push( [ 0.0,  0.0,  0.0 ] );
                            for( let i=0; i<3; i++ ){
                                for( let j=0; j<3; j++ ){
                                    curPnts.slice(-1)[0][i] += dcm[i][j] * p[j];
                                }
                            }
                        }

                        for( var c of coeff ){
                            if( curPnts.length < 1 ) break;
                            var newPnts = [];
                            var PA = curPnts.slice(-1)[0];
                            var SA = PA[0] + c[0] * PA[1]  + c[1] * PA[2];
                            for( var p of curPnts ){
                                var PB = p;
                                var SB = PB[0] + c[0] * PB[1]  + c[1] * PB[2];
                                if( SB >= 0.0 ){
                                    if( SA <= 0.0 ){
                                        var ka =   SB / ( SB - SA );
                                        var kb = - SA / ( SB - SA );
                                        newPnts.push( [ ka * PA[0] + kb * PB[0],
                                                        ka * PA[1] + kb * PB[1],
                                                        ka * PA[2] + kb * PB[2]  ] );
                                    }
                                    newPnts.push( PB );
                                }else{
                                    if( SA > 0.0 ){
                                        var ka = - SB / ( SA - SB );
                                        var kb =   SA / ( SA - SB );
                                        newPnts.push( [ ka * PA[0] + kb * PB[0],
                                            ka * PA[1] + kb * PB[1],
                                            ka * PA[2] + kb * PB[2]  ] );
                                    }
                                }
                                PA = PB;
                                SA = SB;
                            }

                            curPnts = newPnts;
                        }

                        ctx.save();

                        ctx.fillStyle = "#ddd";
                        ctx.fillRect(0, 0, W, H );

                        ctx.beginPath();

                        flag = true;
                        for( let p of curPnts ){

                            XX = W / 2.0 + e * p[1] / p[0];
                            YY = H / 2.0 + e * p[2] / p[0];

                            if( flag ){ ctx.moveTo( XX, YY ); }
                            else      { ctx.lineTo( XX, YY ); }
                            flag = false;
                        }

                        ctx.closePath();
                        ctx.stroke();
                        ctx.clip();

                        wb = imageBitmap.width;
                        hb = imageBitmap.height;
                        if ( W / H < wb / hb ){
                            let w =  W / H * hb;
                            let x = ( wb - w ) / 2;
                            ctx.drawImage(imageBitmap, x, 0, w, hb, 0, 0 ,W, H );
                        } else {
                            let h =  H / W * wb;
                            let y = ( hb - h ) / 2;
                            ctx.drawImage(imageBitmap, 0, y, wb, h, 0, 0 ,W, H );
                        }

                        ctx.restore();

                    })
                    .catch( (e) => {} );
             }, 10 );

        })
        .catch(e => alert("error" + e.message));

};


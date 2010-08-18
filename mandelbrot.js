
(function(window, document, $, undefined) {
  
  var mc = 0;
  function canvas(w, h) {
    var rv = '<canvas id="mandelbrot_canvas_' + (mc++) + '" height="' + h + '" width="' + w + '"></canvas>';
    return rv;
  }

  var defaultKeyColors = [
    [ 10, 10, 245 ],
    [ 245, 245, 10 ],
    [ 245, 10, 10 ],
    [ 218, 20, 225 ]
  ];

  function colorTween(keyColors, k1, k2, map, mp, steps) {
    var
      klen = keyColors.length,
      p0 = keyColors[k1 === 0 ? klen -1 : k1 - 1],
      p1 = keyColors[k1],
      p2 = keyColors[k2],
      p3 = keyColors[k2 === klen - 1 ? 0 : k2 + 1];
    
    function cp(c, p) { return [c * p[0], c * p[1], c * p[2]]; };
    function add() {
      var rv = [0, 0, 0];
      for (var i = 0; i < arguments.length; ++i) {
        var p = arguments[i];
        rv[0] += p[0]; rv[1] += p[1]; rv[2] += p[2];
      }
      return rv;
    }
    function lim(p) {
      return [~~Math.max(0, Math.min(255, p[0])), ~~Math.max(0, Math.min(255, p[1])), ~~Math.max(0, Math.min(255, p[2]))];
    };

    map[mp] = cp(1, keyColors[k1]);
    for (var t = 1; t < steps; ++t) {
      var tt = t / steps, tt2 = tt * tt, tt3 = tt2 * tt;
      var p =
        cp(0.5, add(
          cp(2, p1),
          cp(tt, add(cp(-1, p0), p2)),
          cp(tt2, add(cp(2, p0), cp(-5, p1), cp(4, p2), cp(-1, p3))),
          cp(tt3, add(cp(-1, p0), cp(3, p1), cp(-3, p2), p3))
        ));
      map[mp + t] = lim(p);
    }
  }

  function populateColors(n, keyColors, colorMap) {
    colorMap[0] = [ 0, 0, 0 ];
    for (var i = 0; i < keyColors.length - 1; ++i)
      colorTween(keyColors, i, i + 1, colorMap, 1 + i * n, n);
    colorTween(keyColors, keyColors.length - 1, 0, colorMap, 1 + i * n, n);
  }


  function mandelbrot(sp) {
    if (this.length === 0) return this;

    var
      params = $.extend({}, { size: 500, keyColors: defaultKeyColors, animate: true }, sp),
      sz = params.size,
      animate = !!params.animate,
      colorMap = [],
      z0, z1, maxi, radius, img,
      maxmu = 0, muScale = 0,
      muvals = [],
      blaster = null,
      jqo = this,
      lg2 = Math.log(2);


    function initz() {
      z0 = [-2.3, 1.2], z1 = [.70, -1.2], maxi = 500, radius = 100;
    }
    initz();

    function point(cr, ci) {
      var
        zr = 0, zi = 0, zr2 = 0, zi2 = 0,
        i,
        r2 = radius * radius;

      for (i = 0; i < maxi; ++i) {
        var nzr = zr2 - zi2 + cr;
        zi = 2 * zr * zi + ci;
        zr = nzr;
        var v = (zr2 = zr * zr) + (zi2 = zi * zi);
        if (v > r2) {
          nzr = zr2 + zi2 + cr; ++i;
          zi = 2 * zr * zi + ci;
          zr = nzr;
          nzr = zr * zr + zi * zi + cr; ++i
          zi = 2 * zr * zi + ci;
          zr = nzr;
          v = Math.sqrt((zr2 = zr * zr) + (zi2 = zi * zi));
          var mu = i - Math.log(Math.log(v)) / lg2;
          if (mu > maxmu) maxmu = mu;
          return mu;
        }
      }

      return 0;
    }

    function setMuval(x, y, muval) {
      muvals[x + y * img.width] = muval;
    }

    function scaleMu() {
      var cmlm1 = colorMap.length - 1;
      for (var i = muvals.length; --i >= 0; ) {
        muvals[i] = Math.max(0, Math.min(cmlm1, ~~(muvals[i] * muScale)));
      }
    }

    function mu2img(offset, muvals, colorMap, img) {
      var data = img.data, cmlm1 = colorMap.length - 1, color, sm;
      for (var i = muvals.length, j = i * 4; --i >= 0; ) {
        sm = muvals[i];
        color = sm === 0 ? colorMap[0] : colorMap[1 + (sm - 1 + offset) % cmlm1]

        data[--j] = 255;
        data[--j] = color[2];
        data[--j] = color[1];
        data[--j] = color[0];
      }
    }

    function doit(startupDelay) {
      clearTimeout(blaster);

      maxmu = 0;
      var zwd = z1[0] - z0[0], zhd = z1[1] - z0[1], h, w;
      if (Math.abs(zhd) > Math.abs(zwd)) {
        h = sz;
        w = ~~(sz * Math.abs(zwd/zhd));
      }
      else {
        w = sz;
        h = ~~(sz * Math.abs(zhd/zwd));
      }

      var ctx = canvas(w, h);
      jqo.empty().html(ctx);
      ctx = jqo.find('canvas')[0].getContext('2d');
      ctx.font = '16pt Arial';
      ctx.fillText('now getting it ready', 10, 30);
      ctx.fillText('for you', 20, 55);

      setTimeout(function() {
        img = ctx.createImageData(w, h);

        for (var wi = 0; wi < w; ++wi) {
          var zr = z0[0] + (wi / w) * zwd;
          for (var hi = 0; hi < h; ++hi) {
            var zi = z0[1] + (hi / h) * zhd;
            setMuval(wi, hi, point(zr, zi));
          }
        }
        
        muScale = colorMap.length / maxmu;
        scaleMu();

        var n = 0;
        function blast() {
          if (animate || n === 0) {
            mu2img(n, muvals, colorMap, img);
            ctx.putImageData(img, 0, 0);
            n += 10;
          }
          blaster = setTimeout(blast, 30);
        };
        blaster = setTimeout(blast, 1);

        $('<div/>', { css: { "font-size": "9px" }}).append(
            $('<button/>', {
              click: function() {
                initz(); doit();
              },
              text: 'reset',
              'class': 'mandelbrot-control', id: 'mandelbrot_reset'
            }))
          .append(
            $('<button/>', {
              click: function() {
                $(this).text(animate ? 'be groovy' : 'be square');
                animate = !animate;
              },
              text: animate ? 'be square' : 'be groovy',
              css: { width: '9em', "margin-left": "20px" },
              'class': 'mandelbrot-control', id: 'mandelbrot-animate'
            }))
          .appendTo(jqo);

        var mstart, mstop, rubber, cnv = jqo.find('canvas');

        function nixZoomer() {
          mstart = null;
          if (rubber) rubber.remove();
          rubber = null;
          cnv.css({'cursor': 'pointer'})
          return false;
        }

        $('body')
          .unbind('keypress.mandelbrot')
          .bind('keypress.mandelbrot', function(ev) {
            if (ev.which === 32) nixZoomer();
          });

        function upHandler(ev) {
          if (!mstart) return;
          var dw = Math.abs(mstop[0] - mstart[0]), dh = Math.abs(mstop[1] - mstart[1]),
            dz0 = (z1[0] - z0[0]), dz1 = (z1[1] - z0[1]);
          z0[0] += dz0 * (Math.min(mstop[0], mstart[0]) / w);
          z1[0] -= dz0 * (w - Math.max(mstop[0], mstart[0])) / w;
          z0[1] += dz1 * (Math.min(mstop[1], mstart[1]) / h);
          z1[1] -= dz1 * (h - Math.max(mstop[1], mstart[1])) / h;

          if (dz0 < 0.5) {
            maxi = ~~(radius = 400 * Math.log(1 / dz0));
          }
          else {
            maxi = 500; radius = 200;
          }

          nixZoomer();

          setTimeout(doit, 0);
          return false;
        }

        function moveHandler(ev) {
          if (!mstart || !rubber) return;
          var $this = $(this), offset = cnv.offset(), pos = [event.pageX - offset.left, event.pageY - offset.top];
          
          if (pos[0] > mstart[0]) {
            if (pos[1] > mstart[1]) {
              rubber.css({
                left: (mstart[0] + offset.left) + 'px', top: (mstart[1] + offset.top) + 'px',
                width: (pos[0] - mstart[0]) + 'px', height: (pos[1] - mstart[1]) + 'px',
                cursor: 'se-resize'
              });
              cnv.css({cursor: 'se-resize'});
            }
            else {
              rubber.css({
                left: (mstart[0] + offset.left) + 'px', top: (pos[1] + offset.top) + 'px',
                width: (pos[0] - mstart[0]) + 'px', height: (mstart[1] - pos[1]) + 'px',
                cursor: 'ne-resize'
              });
              cnv.css({cursor: 'ne-resize'});
            }
          }
          else {
            if (pos[1] > mstart[1]) {
              rubber.css({
                left: (pos[0] + offset.left) + 'px', top: (mstart[1] + offset.top) + 'px',
                width: (mstart[0] - pos[0]) + 'px', height: (pos[1] - mstart[1]) + 'px',
                cursor: 'sw-resize'
              });
              cnv.css({cursor: 'sw-resize'});
            }
            else {
              rubber.css({
                left: (pos[0] + offset.left) + 'px', top: (pos[1] + offset.top) + 'px',
                width: (mstart[0] - pos[0]) + 'px', height: (mstart[1] - pos[1]) + 'px',
                cursor: 'nw-resize'
              });
              cnv.css({cursor: 'nw-resize'});
            }
          }
          mstop = pos;
          return false;
        }

        cnv
          .css({'cursor': 'pointer'})
          .bind('mousedown.mandelbrot', function(ev) {
            if (ev.which !== 1) return;
            nixZoomer();
            var $this = $(this), offset = $this.offset();
            mstart = [ev.pageX - offset.left, ev.pageY - offset.top];
            rubber = $('<div/>', {
              css: {
                position: 'absolute',
                left: mstart[0] + offset.left, 'top': mstart[1] + offset.top,
                'border-width': '2px', 'border-color': 'white', 'border-style': 'solid',
                width: '0px', height: '0px' }
            })
            .appendTo('body')
            .bind('mousemove.mandelbrot', moveHandler)
            .bind('mouseup.mandelbrot', upHandler)
            .bind('mousedown.mandelbrot', nixZoomer)
            ;
          })
          .bind('mousemove.mandelbrot', moveHandler)
          .bind('mouseup.mandelbrot', upHandler)
        ;
      }, startupDelay || 1);
    }

    populateColors(~~(4096 / params.keyColors.length), params.keyColors, colorMap);

    doit(params.startupDelay);

    return jqo;
  }

  $.fn.mandelbrot = mandelbrot;

})(this, this.document, this.jQuery);

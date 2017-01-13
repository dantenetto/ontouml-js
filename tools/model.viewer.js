/**
 *  Módulo model viewer
 * 
 *  namespace: viewer
 **/

(function (env, undef) {
	"use strict";
	
	var viewer;
	
	env.viewer = viewer = {};
	
	viewer.model = {
		_context: null,

		canvasId: null,
		
		colors: {
			kind: '#8888dd',
			role: '#88dddd',
			phase: '#cccccc',
			relator: '#dd8888'
		},
				
		init: function (canvasId, domain) {
			this.canvasId = canvasId;
			
			this.domain = domain;
		},
		
		render: function () {
			var canvas = document.getElementById(this.canvasId);
			
			this._context = canvas.getContext('2d');
		},
		
		drawBox: function (pos, stereotype, name) {
			var size = {
				width: 100,
				height: 50
			}, ctx = this._context;
			
			ctx.fillStyle = this.colors[stereotype];
			ctx.fillRect(pos.x, pos.y, size.width, size.height);
			
			ctx.font = "normal 12px courier new";
			ctx.textAlign = "center";
			ctx.fillStyle = 'black';
			ctx.fillText(
				'<<' + stereotype + '>>', 
				pos.x + (size.width / 2), 
				pos.y + 15);
			
			ctx.font = "bold 16px courier new";
			ctx.fillText(name, pos.x + (size.width / 2), pos.y + 35);
		},
		
		drawTriangle: function (pos) {
			var ctx = this._context,
				size = {
					width: 12,
					height: 8
				};
			
			ctx.strokeStyle = "1px solid black";
			ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + size.width / 2, pos.y + size.height);
            ctx.lineTo(pos.x - size.width / 2, pos.y + size.height);
            ctx.closePath();
            ctx.stroke();
		},
	};

}(this));

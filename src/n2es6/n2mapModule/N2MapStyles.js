/**
* @module n2es6/n2mapModule/N2MapStyles
*/
import {Fill, RegularShape, Stroke, Style, Text} from 'ol/style.js';
import CircleStyle from 'ol/style/Circle';

const StyleNamesMap = {
	"fill": "Style.fill.color"
	,"fill-opacity": "Style.fill.color.[3]"
	,"stroke": "Style.stroke.color"
	,"stroke-opacity": "Style.stroke.color.[3]"
	,"stroke-width": "Style.stroke.width"
	,"stroke-linecap": "Style.stroke.lineCap"
	,"stroke-dasharray": "Style.stroke.lineDash"
	,"r": ""
	,"pointer-events": ""
	,"color": ""
	,"font-family": "Style.text.font.[2]"
	,"font-size": "Style.text.font.[1]"
	,"font-weight": "Style.text.font.[0]"
}
class N2MapStyles {

	/**
	* N2MapStyles constructor
	*/
	constructor(){

		this.cache = {};

	}
	/**
	* [loadStyleFromN2Symbolizer description] The function that convert a n2 symbolizer to
	* ol5 map style obj.
	* @param  {import 'nunaliit2/n2.styleRule.js'.Symbolizer} symbolizer []
	* @return {import 'ol/style/Style.js'.default} [produce a ol5 Style object]
	*/
 	loadStyleFromN2Symbolizer( symbolizer ){

		let symbolizerId = symbolizer.id;
		var styleObj = this.cache[symbolizerId];
		if (!styleObj ) {
			let symbols = symbolizer.symbols;
			styleObj =  this.getOl5StyleObjFromSymbol(symbols);
			this.cache[symbolizerId]= styleObj;
		}
		return styleObj;
	}
	/**
	* [getOl5StyleObjFromSymbol return the ol5 stylemap object from nunaliit2 internal style tags
	* @param  {[type]} symbols [An nunaliit2 style symbolizer.symbols]
	* @return {[type]}         [import 'ol/style/Style.js'.default]
	*/
	getOl5StyleObjFromSymbol(symbols) {

		var internalOl5StyleNames = {};
		for( var tags in symbols) {
			var internalOl5StyleName = StyleNamesMap[tags] ;
			if (internalOl5StyleName && internalOl5StyleName !== '') {
				internalOl5StyleNames[internalOl5StyleName] = symbols[tags];
			}
		}
		return this.getOl5StyleObjFromStyleName(internalOl5StyleNames);
	}
	/**
	* [getOl5StyleObjFromOl5StyleNames description]
	* @param  {[type]} n2InternalStyle [description]
	* @return {[type]}                 [description]
	*/
	getOl5StyleObjFromStyleName(n2InternalStyle) {
		var handle = {};
		var _this = this;
		for (var tags in n2InternalStyle) {
			var arr = tags.split(".");
			handle.style  = recurProps ( arr, handle , n2InternalStyle[tags]);
		}
		return [handle.style];

		function recurProps (tagarr, supernode, value){
			if(  !tagarr ){
				return;
			}
			let currNodeString = tagarr[0];
			if (currNodeString === 'Style') {
				let currnode = supernode.style
				if (!currnode) {
					currnode = new Style({
						image: new CircleStyle({
							fill: new Fill({color: 'rgba(255,255,255,0.4)'}),
							stroke: new Stroke({color: '#3399CC', width: 1.25}),
							radius: 5
						})
					})
				}
				currnode[tagarr[1]+'_'] =
				recurProps (tagarr.slice(1),
				currnode,
				value)
				return  currnode;

			} else if (currNodeString === 'image') {
				let currnode = supernode.getImage();
				if (!currnode) {
					currnode = new CircleStyle({
						fill: new Fill({color: 'rgba(255,255,255,0.4)'}),
						stroke: new Stroke({color: '#3399CC', width: 1.25}),
						radius: 5
					});
				}
				currnode[tagarr[1]+'_'] =
				recurProps (tagarr.slice(1),
				currnode,
				value)
				return  currnode;

			} else if (currNodeString === 'text') {
				let currnode = supernode.getText();
				if (!currnode) {
					currnode = new Text();
				}

				currnode[tagarr[1]+'_'] =
				recurProps (tagarr.slice(1),
				currnode,
				value);
				return  currnode;


			} else if (currNodeString === 'fill') {
				let currnode = supernode.getFill();
				if (!currnode) {
					currnode = new Fill();
				}
				currnode['checksum_'] = undefined;
				currnode[tagarr[1]+'_'] =
				recurProps (tagarr.slice(1),
				currnode,
				value);


				return  currnode;


			} else if (currNodeString === 'stroke') {
				let currnode = supernode.getStroke();
				if (!currnode) {
					currnode = new Stroke();
				}
				currnode['checksum_'] = undefined;
				currnode[tagarr[1]+ '_'] =
				recurProps (tagarr.slice(1),
				currnode,
				value);
				return  currnode;


			} else if (currNodeString.indexOf('color') === 0 ) {
				let color = supernode.getColor();
				let colorArr = _this.colorValues(color);
				let newColorArr ;
				if ( !colorArr ) {
					colorArr = _this.colorValues('white');
				}

				if (tagarr.length === 1) {
					newColorArr = _this.colorValues(value);
					if (newColorArr && Array.isArray(newColorArr)) {
						colorArr = newColorArr;
					}
					return colorArr;
				} else if (tagarr.length > 1) {
					return recurProps (tagarr.slice(1), colorArr, value);
				} else {
					throw new Error ("N2MapStyles: input color-string error");
				}

			} else if (currNodeString.indexOf('font') === 0 ){
				//font property is a string with 2 or 3 words
				//font = weight + ' ' + size + ' ' + font
				//for instance:
				//font: 'bold 11px Arial, Verdana, Helvetica, sans-serif'
				// It is a mess, and constructing
				let font = supernode.getFont();
				let fontArr = [];
				if (!font) {
					fontArr = ['normal', '10px', 'sans-serif'];
				} else {
					fontArr = font.split(' ');
				}

				if (fontArr.length <= 0) {
					throw new Error('N2MapStyles: Bad Font Property');
				} else if (fontArr.length < 2 && fontArr.length > 0) {
					fontArr.unshift('normal', '10px');
				} else if (fontArr.length < 3 && fontArr.length > 1) {
					fontArr.unshift('normal');
				}
				if (tagarr.length === 1) {
					return fontArr.join();
				} else if (tagarr.length > 1){
					return recurProps (tagarr.slice(1), fontArr, value);
				} else {
					throw new Error ("N2MapStyles: input font-string error");
				}
			} else if (currNodeString.indexOf('\[') === 0){

					let idx = parseInt( currNodeString.replace(/\[(\d)\]/g, '$1') );
					if (typeof idx === 'number') {
						supernode [idx] = value;
						return supernode;
					} else {
						throw new Error ('N2MapStyles: value index format error');
					}

			} else if (currNodeString.indexOf('width') === 0 ){
				return ( parseInt (value) );
			} else if (currNodeString.indexOf('lineCap') === 0 ){
				return ('' + value);
			} else if (currNodeString.indexOf('lineDash') === 0 ) {
				switch(value) {
					case 'dot':
						return [2,10];
					case 'dash':
						return [5,10];
					case 'dashdot':
						return  [2, 5, 10];
					case 'longdash':
					 	return [15];
					case 'longdashdot':
						return [4, 10, 20];
					default:
						return [1];

				}
			} else {
				throw new Error('N2MapStyles: Bad Style Tags');
			}
		}

	}

	// return array of [r,g,b,a] from any valid color. if failed returns undefined
	/*
	Examples:
	colorValues('transparent'); // [0,0,0,0]
	colorValues('white'); // [255, 255, 255, 1]
	colorValues('teal'); // [0, 128, 128, 1]
	colorValues('rgba(11,22,33,.44)'); // [11, 22, 33, 0.44]
	colorValues('rgb(11,22,33)'); // [11, 22, 33, 1]
	colorValues('#abc'); // [170, 187, 204, 1]
	colorValues('#abc6'); // [170, 187, 204, 0.4]
	colorValues('#aabbcc'); // [170, 187, 204, 1]
	colorValues('#aabbcc66'); // [170, 187, 204, 0.4]
	colorValues('asdf'); // undefined
	colorValues(''); // undefined
	colorValues(NaN); // Script Error
	colorValues(123); // Script Error
	*/
	/**
	* [colorValues description]
	* @param  {[type]} color [description]
	* @return {[type]}       [description]
	*/
	colorValues(color){
		if (!color)
		return;
		if (Array.isArray(color)){
			if (color.length === 4) {
				return color;
			} else if (color.length === 3){
				return color.push(1);
			}
		}
		if (typeof color === 'string' && color.toLowerCase() === 'transparent')
		return [0, 0, 0, 0];
		if (color[0] === '#')
		{
			if (color.length < 7)
			{
				// convert #RGB and #RGBA to #RRGGBB and #RRGGBBAA
				color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + (color.length > 4 ? color[4] + color[4] : '');
			}
			return [parseInt(color.substr(1, 2), 16),
				parseInt(color.substr(3, 2), 16),
				parseInt(color.substr(5, 2), 16),
				color.length > 7 ? parseInt(color.substr(7, 2), 16)/255 : 1];
			}
			if (color.indexOf('rgb') === -1)
			{
				// convert named colors
				var temp_elem = document.body.appendChild(document.createElement('fictum')); // intentionally use unknown tag to lower chances of css rule override with !important
				var flag = 'rgb(1, 2, 3)'; // this flag tested on chrome 59, ff 53, ie9, ie10, ie11, edge 14
				temp_elem.style.color = flag;
				if (temp_elem.style.color !== flag)
				return; // color set failed - some monstrous css rule is probably taking over the color of our object
				temp_elem.style.color = color;
				if (temp_elem.style.color === flag || temp_elem.style.color === '')
				return; // color parse failed
				color = getComputedStyle(temp_elem).color;
				document.body.removeChild(temp_elem);
			}
			if (color.indexOf('rgb') === 0)
			{
				if (color.indexOf('rgba') === -1)
				color += ',1'; // convert 'rgb(R,G,B)' to 'rgb(R,G,B)A' which looks awful but will pass the regxep below
				return color.match(/[\.\d]+/g).map(function (a)
				{
					return +a
				});
			}
		}
	}
	export default N2MapStyles

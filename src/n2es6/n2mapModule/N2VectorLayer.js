/**
 * @module n2es6/n2mapModule/N2VectorLayer
 */
import VectorLayer from 'ol/layer/Vector.js';


const hoverInfo = {
	feature: null
	,endFn: []
};
const clickedInfo = {
	features: []
	,endFn: []
	,fids: {}
	,selectedId: null
};
const focusInfo = {
	fids: {}
	,features: []
};
const findFeatureInfo = {
	fid: null
	,features: []
};
/**
 * @classdesc
 * A Nunaliit2 layer dealing with register the event
 * @api
 */


class N2VectorLayer extends VectorLayer {

	constructor(options) {
		super(options);

	}


}

	export default N2VectorLayer;

/**
* @module n2es6/n2mapModule/N2SourceWithN2Intent
*/

import VectorSource from 'ol/source/Vector.js';
import {listen} from 'ol/events.js';
import EventType from 'ol/events/EventType.js';

/**
 * @classdesc
 * @extends VectorSource
 */

class N2SourceWithN2Intent extends VectorSource {

	/**
	 * [constructor description]
	 * @param {Options} options [description]
	 */
	constructor(options) {

		super(options);
		
		/**
		 * [resolution description]
		 * @type {number|undefined}
		 */
		this.resolution = undefined;
		/**
		 * [source description]
		 * @type {[type]}
		 */
		this.source = options.source;
		/**
		 * [features array with N2 label in it]
		 * @type {Array}
		 */
		this.features = [];

		//-------------------------
		// HOVER and CLICK
		this.selectFeatureControl = null;
		this.hoverInfo = {
			feature: null
			,endFn: []
		};
		this.clickedInfo = {
			features: []
			,endFn: []
			,fids: {}
			,selectedId: null
		};
		this.focusInfo = {
			fids: {}
			,features: []
		};
		this.findFeatureInfo = {
			fid: null
			,features: []
		};

		this.interaction = options.interaction ? options.interaction:
												new N2Select();//new N2Intent({});

		//-------------------------

		listen(this.interaction, EventType.HOVER,  this.onHover, this);
		listen(this.interaction, EventType.CLICKED,  this.onClicked, this);
		listen(this.interaction, EventType.FOCUS,  this.onFocus, this);
		listen(this.interaction, EventType.FIND,  this.onFind, this);

	}

	onHover(evt){
		return true;
	}
	onClicked(evt){
		return true;
	}
	onFocus(evt){
		return true;
	}
	onFind(evt){
		return true;
	}


	loadFeatures(extent, resolution, projection) {
		this.source.loadFeatures(extent, resolution, projection);
		if (resolution !== this.resolution) {

			this.clear();
			this.resolution = resolution;
			this.projection = projection;
			this.addN2Label();
			this.addFeatures(this.features);
		}
	}
	refresh() {
		this.clear();
		this.addN2Label();
		this.addFeatures(this.features);
		super.refresh();
	}

	/**
	 * [addN2Label description]
	 */
	addN2Label() {
		if (this.resolution === undefined) {
	      return;
	    }
		this.features.length = 0;
		let features = this.source.getFeatures();
		if( features ) {
				for(let i=0,e=features.length;i<e;++i){
					var f = features[i];
					if( this.clickedInfo.fids[f.fid] ){
						var featureInfo = this.clickedInfo.fids[f.fid];

						this.clickedInfo.features.push(f);

						if( featureInfo.clicked ) {
							f.isClicked = true;
						};

						if( featureInfo.intent ) {
							f.n2SelectIntent = featureInfo.intent;
						};
					};
					if( this.focusInfo.fids[f.fid] ){
						this.focusInfo.features.push(f);
						f.isHovered = true;
					};
					if( this.findFeatureInfo.fid === f.fid ){
						this.findFeatureInfo.features.push(f);
						f.n2Intent = 'find';
					};
					let featuresInCluster = f.get('featuresInCluster');
					if( featuresInCluster && Array.isArray(featuresInCluster) ){
						for(let j=0,k=featuresInCluster.length; j<k; ++j){
							let clusterFeature = featuresInCluster[j];
							if( this.clickedInfo.fids[clusterFeature.fid] ){
								var featureInfo = this.clickedInfo.fids[clusterFeature.fid];
								this.clickedInfo.features.push(f);
								if( featureInfo.clicked ) {
									f.isClicked = true;
								};
								if( featureInfo.intent ) {
									f.n2SelectIntent = featureInfo.intent;
								};
							};
							if( this.focusInfo.fids[clusterFeature.fid] ){
								this.focusInfo.features.push(f);
								f.isHovered = true;
							};
							if( this.findFeatureInfo.fid === clusterFeature.fid ){
								this.findFeatureInfo.features.push(f);
								f.n2Intent = 'find';
							};
						};
					};
					this.features.push(f);
				};
			};

	}






}
 export default N2SourceWithN2Intent;

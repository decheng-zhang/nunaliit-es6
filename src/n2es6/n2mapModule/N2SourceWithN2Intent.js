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
		 * [features_ array with N2 label in it]
		 * @type {Array}
		 */
		this.features_ = [];

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

		this.interaction_ = options.interaction ;//new N2Intent({});
		if (!this.interaction_) {
			throw new Error("A valid interaction must be provided for "
			 +"this custom source");
		}
		//-------------------------
		listen(this.source, EventType.CHANGE, this.refresh, this);

		this.interaction_.on( "hover",  this.onHover);
		this.interaction_.on( "clicked",  this.onClicked);
		this.interaction_.on( "focus",  this.onFocus);
		this.interaction_.on( "find",  this.onFind);

	}

	onHover(evt){
	    console.log("Rec: hovered feature: " + (evt.selected? evt.selected.ol_uid : null) +
			"dehovered: " + (evt.deselected ? evt.deselected.ol_uid: null));
		return true;
	}
	onClicked(evt){
		console.log("Rec: clicked feature: " + evt.selected.length +
					"declicked: " + evt.deselected.length);
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
			this.addFeatures(this.features_);
		}
	}

	refresh() {
		this.clear();
		this.addN2Label();
		this.addFeatures(this.features_);
		super.refresh();
	}

	/**
	 * [addN2Label description]
	 */
	addN2Label() {
		if (this.resolution === undefined) {
	      return;
	    }
		this.features_.length = 0;
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
					this.features_.push(f);
				};
			};

	}






}
 export default N2SourceWithN2Intent;

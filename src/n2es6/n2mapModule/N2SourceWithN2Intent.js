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
		let selected  = evt.selected;
		
		
		//In case, there is single feature inside a N2Cluster features collection
	    if (selected){
	    	let innerFeatures = selected.get('featuresInCluster');
	    	if( innerFeatures && innerFeatures.length == 1){
	    		selected = innerFeatures[0];
	    	}
		}
	    if (this.hoverInfo.feature === selected) {
	    	//no really going to happen.
	    	return;
	    }
	    
	    this._endHover();
	    this.hoverInfo.feature = feature;
	    
	    if( this.interaction_.onStartHover ) {
	    	this.interaction_.onStartHover (feature);
	    }
		console.log("Rec: hovered feature: " + (evt.selected? evt.selected.ol_uid : null) +
			"dehovered: " + (evt.deselected ? evt.deselected.ol_uid: null));
		return true;
	}
	//clear up for hover
	_endHover() {
		for(var i=0,e=this.hoverInfo.endFn.length; i<e; ++i) {
			//try{
			this.hoverInfo.endFn[i](); 
			//} catch(e){};
		};
		this.hoverInfo.feature = null;
		this.hoverInfo.endFn = [];
	}
	
	onClicked(evt){
		let selected , deselected;
		if ( evt.selected ) {
			if ( evt.selected.length === 1 ){
				selected = evt.selected[0];
			} else {
				throw new Error ("Nunaliit only support single click");
			}
		}
		
		if ( evt.deselected ) {
			if ( evt.deselected.length === 1 ){
				deselected = evt.deselected[0];
			} else {
				throw new Error ("Nunaliit only support single click");
			}
		}
		//In case, there is single feature inside a N2Cluster features collection
		if( selected ){
			let innerFeatures = selected.get('featuresInCluster');
			if( innerFeatures && innerFeatures.length == 1){
				selected = innerFeatures[0];
			}
		}
		
		if( deselected ){
			let innerFeatures = deselected.get('featuresInCluster');
			if( innerFeatures && innerFeatures.length == 1){
				deselected = innerFeatures[0];
			}
		}
		this._endClicked();
		if (typeof deselected !== 'undefined') {
			this._dispatch({type:'userUnselect',docId:deselected.fid});
		}
		if (typeof selected !== 'undefined') {
			this.clickedInfo.features = [selected];

			this.clickedInfo.fids = {};
			this.clickedInfo.fids[selected.fid] = { clicked: true };
			this.clickedInfo.selectedId = selected.fid;
			
			selected.isClicked = true;
			//ol2's layer drawFeature here, but I don't think we need that in ol5
			//I will see.
			if( this.interaction_.onStartClick ) {
				this.interaction_.onStartClick(selected);
			};
		}
		
		
		return true;
	}
	//clear up for click
	_endClicked() {
		if( this.clickedInfo.features ) {
			for(var i=0,e=this.clickedInfo.features.length;i<e;++i){
				var feature = this.clickedInfo.features[i];
				
				if( feature.isClicked ) {
					feature.isClicked = false;
					feature.n2SelectIntent = null;
				}
			}
		}
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
			this.updateN2Label();
			this.addFeatures(this.features_);
		}
	}

	refresh() {
		this.clear();
		this.updateN2Label();
		this.addFeatures(this.features_);
		super.refresh();
	}

	/**
	 * [addN2Label description]
	 */
	updateN2Label() {
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
	
	_getDispatchService(){
		var d = null;
		if( this.options.directory ) {
			d = this.options.directory.dispatchService;
		};
		
		return d;
	}
	
	_dispatch(m){
		var dispatcher = this._getDispatchService();
		if( dispatcher ) {
			dispatcher.send(DH,m);
		};
	}






}
 export default N2SourceWithN2Intent;

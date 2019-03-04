/**
* @module n2es6/n2mapModule/N2SourceWithN2Intent
*/

import VectorSource from 'ol/source/Vector.js';
import {listen} from 'ol/events.js';
import EventType from 'ol/events/EventType.js';


var _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); };
var DH = 'n2.canvasMap';
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

		
		this.dispatchService = options.dispatchService;
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
		
		
		//this.interaction_.on( "hover",  this.onHover.bind(this));
		this.interaction_.on( "clicked",  this.onClicked.bind(this));
		this.interaction_.on( "focus",  this.onFocus.bind(this));
		this.interaction_.on( "find",  this.onFind.bind(this));

	}

	onHover(evt){
		let selected  = evt.selected;
		
		
		//In case, there is single feature inside a N2Cluster features collection
	    if (selected){
	    	let innerFeatures = selected.cluster;
	    	if( innerFeatures && innerFeatures.length == 1){
	    		selected = innerFeatures[0];
	    	}
		}
	    if (this.hoverInfo.feature === selected) {
	    	//no really going to happen.
	    	return;
	    }
	    
	    this._endHover();
	    this.hoverInfo.feature = selected;
	    
	    if( this.interaction_.onStartHover ) {
	    	this.interaction_.onStartHover (selected);
		}
		//console.log("Rec: hovered feature: " + (evt.selected? evt.selected.ol_uid : null) +
		//	"dehovered: " + (evt.deselected ? evt.deselected.ol_uid: null));	
	    this.refresh();
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
		
		let selected = evt.selected;
		let deselected = evt.deselected;
		if ( selected && selected.length >= 0) {
			if ( selected.length === 1 ){
				selected = selected[0];
			} else if (selected.length === 0){
				selected = null;
			} else {
				throw new Error ("Nunaliit only support click one item a time");
			}
		}
		
		if ( deselected && deselected.length >= 0) {
			if ( deselected.length === 1 ){
				deselected = deselected[0];
			} else if (deselected.length === 0) {
				deselected = null;
			} else {
				throw new Error ("Nunaliit only support click one item a time");
			}
		}
		//In case, there is single feature inside a N2Cluster features collection
		if( selected ){
			let innerFeatures = selected.cluster;
			if( innerFeatures && innerFeatures.length == 1){
				selected = innerFeatures[0];
			}
		}
		
		if( deselected ){
			let innerFeatures = deselected.cluster;
			if( innerFeatures && innerFeatures.length == 1){
				deselected = innerFeatures[0];
			}
		}
		this._endClicked();
		if (deselected
				&& deselected.fid
				&& typeof deselected !== 'undefined' && deselected) {
			this._dispatch({type: 'userUnselect',
							docId: deselected.fid
							});
		}
		if ( selected 
				&& selected.fid 
				&&typeof selected !== 'undefined' ) {
			this.clickedInfo.features = [selected];

			this.clickedInfo.fids = {};
			this.clickedInfo.fids[selected.fid] = { clicked: true };
			this.clickedInfo.selectedId = selected.fid;
			
			selected.isClicked = true;
			//In ol2's implementation, layer drawFeature here, but I don't think we need that in ol5
			//I will see.
			//Exec each interaction's startClick callback
			if( this.interaction_.onStartClick ) {
				this.interaction_.onStartClick(selected);
			};
		}
		this.refresh();
		return true;
	}
	//clear up for click
	_endClicked() {
		if( this.clickedInfo.features ) {
			for(var i=0,e=this.clickedInfo.features.length;i<e;++i){
				var feature = this.clickedInfo.features[i];
				
				if( feature.isClicked ) {
					this.clickedInfo.fids = {};
					feature.isClicked = false;
					feature.n2SelectIntent = null;
				}
			}
		}
		
		this.clickedInfo.endFn = [];
		this.clickedInfo.features = [];
		this.clickedInfo.fids = {};
		this.clickedInfo.selectedId = null;
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
		this.changed();
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
					
					//Deal with n2_ tags to support style system
					var f = features[i];
					if( this.clickedInfo.fids[f.fid] ){
						var featureInfo = this.clickedInfo.fids[f.fid];

						this.clickedInfo.features.push(f);

						if( featureInfo.clicked ) {
							f.isClicked = true;
							f.n2_selected = true;
						};

						if( featureInfo.intent ) {
							f.n2SelectIntent = featureInfo.intent;
						};
					} else {
						f.n2_selected = false;
					};
					if( this.focusInfo.fids[f.fid] ){
						this.focusInfo.features.push(f);
						f.isHovered = true;
						f.n2_hovered = true;
					} else {
						f.n2_hovered = false;
					};
					if( this.findFeatureInfo.fid === f.fid ){
						this.findFeatureInfo.features.push(f);
						f.n2Intent = 'find';
						f.n2_found = true;
					} else {
						f.n2_found = false;
					};
					
					//Deal with cluster feature n2_ tags
					
					let featuresInCluster = f.cluster;
					if( featuresInCluster && Array.isArray(featuresInCluster) ){
						for(let j=0,k=featuresInCluster.length; j<k; ++j){
							let clusterFeature = featuresInCluster[j];
							let featureInfo = this.clickedInfo.fids[clusterFeature.fid];
							
							if( featureInfo ){
								this.clickedInfo.features.push(f);
								if( clusterFeature.isClicked || featureInfo.clicked ) {
									f.isClicked = true;
									f.n2_selected = true;
								} else {
									f.n2_selected = false;
								};
								if( featureInfo.intent ) {
									f.n2SelectIntent = featureInfo.intent;
								};
							};
							if( this.focusInfo.fids[clusterFeature.fid] ){
								this.focusInfo.features.push(f);
								f.isHovered = true;
								f.n2_hovered = true;
							} else {
								f.n2_hovered = false;
							};
							if( this.findFeatureInfo.fid === clusterFeature.fid ){
								this.findFeatureInfo.features.push(f);
								f.n2Intent = 'find';
								f.n2_found = true;
							} else {
								f.n2_found = false;
							};
						};
					};
					
					//Deal with _n2Type tag
					var geomType = f.getGeometry()._n2Type;
					if ( !geomType ) {
						if ( f
								.getGeometry()
								.getType()
								.indexOf('Line') >= 0){
							geomType = f.getGeometry()._n2Type = 'line';
							
						} else if ( f
									.getGeometry()
									.getType()
									.indexOf('Polygon') >= 0){
							geomType = f.getGeometry()._n2Type = 'polygon';
						} else {
							geomType = f.getGeometry()._n2Type = 'point';
						}
					}
					f.n2_geometry = geomType;
					
					//Deal with n2_doc tag
					var data = f.data;
					if (f 
						&& f.cluster
						&& f.cluster.length === 1) {
						data = f.cluster[0].data;
					};
					f.n2_doc = data;
					
					this.features_.push(f);
				};
			};

	}
	
	_getDispatchService(){
		var d = null;
		if( this.dispatchService ) {
			d = this.dispatchService;
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

// Generated Code for the Draw2D touch HTML5 lib.
// File will be generated if you save the *.shape file.
//
// created with http://www.draw2d.org
//
//
var NewComponent2 = CircuitFigure.extend({

   NAME: "NewComponent2",
   VERSION: "local-version",

   init:function(attr, setter, getter)
   {
     var _this = this;

     this._super( $.extend({stroke:0, bgColor:null, width:135.08515832614648,height:135.08515832614648},attr), setter, getter);
     var port;
   },

   createShapeElement : function()
   {
      var shape = this._super();
      this.originalWidth = 135.08515832614648;
      this.originalHeight= 135.08515832614648;
      return shape;
   },

   createSet: function()
   {
       this.canvas.paper.setStart();
       var shape = null;
       // BoundingBox
       shape = this.canvas.paper.path("M0,0 L135.08515832614648,0 L135.08515832614648,135.08515832614648 L0,135.08515832614648");
       shape.attr({"stroke":"none","stroke-width":0,"fill":"none"});
       shape.data("name","BoundingBox");
       
       // Circle
       shape = this.canvas.paper.path('M9 33.87634848390189L4.0733159346855246 44.44165655713368L1.0261235448379011 55.813933376481145L0 67.54257916307324L1.0261235448379011 79.27122494966534L4.0733159346855246 90.6435017690128L9.048989770730259 101.31386874460986L15.801961721277621 110.95811217536902L24.12704615077746 119.28319660486886L33.77128958153662 126.03616855541622L44.44165655713368 131.01184239146096L55.813933376481145 134.05903478130858L67.54257916307324 135.08515832614648L79.27122494966534 134.05903478130858L90.6435017690128 131.01184239146096L101.31386874460986 126.03616855541622L110.95811217536902 119.28319660486886L119.28319660486886 110.95811217536902L126.03616855541622 101.31386874460986L131.01184239146096 90.6435017690128L134.05903478130858 79.27122494966534L135.08515832614648 67.54257916307324L134.05903478130858 55.813933376481145L131.01184239146096 44.44165655713368L126.03616855541622 33.77128958153662L119.28319660486886 24.12704615077746L110.95811217536902 15.801961721277621L101.31386874460986 9.048989770730259L90.6435017690128 4.0733159346855246L79.27122494966534 1.0261235448379011L67.54257916307324 0L55.813933376481145 1.0261235448379011L44.44165655713368 4.0733159346855246L33.77128958153662 9.048989770730259L24.12704615077746 15.801961721277621L22.38642870898184 17.542579163073242L31 17.542579163073242L31 75.54257916307324L9 75.54257916307324L9 33.87634848390189Z');
       shape.attr({"stroke":"none","stroke-width":0,"fill":"rgba(149,192,106,1)","dasharray":null,"stroke-dasharray":null,"opacity":1});
       shape.data("name","Circle");
       

       return this.canvas.paper.setFinish();
   }
});

/**
 * Generated Code for the Draw2D touch HTML5 lib.
 * File will be generated if you save the *.shape file.
 *
 * by 'Draw2D Shape Designer'
 *
 * Custom JS code to tweak the standard behaviour of the generated
 * shape. add your custom code and event handler here.
 *
 * Looks disconcerting - extending my own class. But this is a good method to
 * merge basic code and override them with custom methods.
 */
NewComponent2 = NewComponent2.extend({

    init: function(attr, setter, getter){
         this._super(attr, setter, getter);

         // your special code here
    },

    /**
     *  Called by the simulator for every calculation
     *  loop
     *  @param {Object} context context where objects can store or handover global variables to other objects.
     *  @required
     **/
    calculate:function( context)
    {
    },


    /**
     *  Called if the simulation mode is starting
     *  @required
     **/
    onStart:function( context )
    {
    },

    /**
     *  Called if the simulation mode is stopping
     *  @required
     **/
    onStop:function( context )
    {
    },

    /**
     * Get the simulator a hint which kind of hardware the shapes requires or supports
     * This helps the simulator to bring up some dialogs and messages if any new hardware is connected/get lost
     * and your are running a circuit which needs this kind of hardware...
     **/
    getRequiredHardware: function(){
      return {
        raspi: false,
        arduino: false
      }
    }

});
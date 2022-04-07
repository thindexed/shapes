// Generated Code for the Draw2D touch HTML5 lib.
// File will be generated if you save the *.shape file.
//
// created with http://www.draw2d.org
//
//
var blahblah_NewComponent = CircuitFigure.extend({

   NAME: "blahblah_NewComponent",
   VERSION: "local-version",

   init:function(attr, setter, getter)
   {
     var _this = this;

     this._super( $.extend({stroke:0, bgColor:null, width:56.41623897901445,height:95.77402611639809},attr), setter, getter);
     var port;
   },

   createShapeElement : function()
   {
      var shape = this._super();
      this.originalWidth = 56.41623897901445;
      this.originalHeight= 95.77402611639809;
      return shape;
   },

   createSet: function()
   {
       this.canvas.paper.setStart();
       var shape = null;
       // BoundingBox
       shape = this.canvas.paper.path("M0,0 L56.41623897901445,0 L56.41623897901445,95.77402611639809 L0,95.77402611639809");
       shape.attr({"stroke":"none","stroke-width":0,"fill":"none"});
       shape.data("name","BoundingBox");
       
       // Rectangle
       shape = this.canvas.paper.path('M5.416238979014452 57.72766383485941L5.416238979014452 95.77402611639809L56.41623897901445 95.77402611639809L56.41623897901445 18.77402611639809L47.87787905247478 18.77402611639809L48.27157803834143 23.27402611639809L47.73445099501532 29.413416314846472L46.13939019844838 35.36626424879705L43.53486076380432 40.951695646062035L0 0L35.64221286261636 50.35778713738364L30.593908508678396 53.89264790118796L25.008477111413413 56.49717733583202L19.055629177462833 58.09223813239896L12.916238979014452 58.62936517572507L6.77684878056607 58.09223813239896L5.416238979014452 57.72766383485941Z');
       shape.attr({"stroke":"rgba(48,48,48,1)","stroke-width":1,"fill":"rgba(255,255,255,1)","dasharray":null,"stroke-dasharray":null,"opacity":1});
       shape.data("name","Rectangle");
       

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
blahblah_NewComponent = blahblah_NewComponent.extend({

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
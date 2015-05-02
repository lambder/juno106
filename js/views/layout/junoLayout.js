define([
    'backbone',
    'application',
    'views/layout/moduleLayout',
    'views/item/keyboardItemView',
    'voice',
    'lfo',
    'tuna',
    'models/junoModel',
    'hbs!tmpl/layout/junoLayout-tmpl'
    ],
    
    function(Backbone, App, ModuleLayout, KeyboardItemView, Voice, LFO, Tuna, JunoModel, Template) {
        return Backbone.Marionette.LayoutView.extend({
            
            className: 'juno',
            
            template: Template,
            
            regions: {
                synthRegion: '.js-synth-region',
                keyboardRegion: '.js-keyboard-region'
            },
            
            initialize: function() {
                this.maxPolyphony = 6;
                this.activeVoices = {};
                this.synth = new JunoModel();
                
                var tuna = new Tuna(App.context);
                this.chorus = new tuna.Chorus();
                
                this.lfo = new LFO();
            },
            
            onShow: function() {
                this.moduleLayout = new ModuleLayout({
                    synth: this.synth
                });
                this.synthRegion.show(this.moduleLayout);
                
                this.keyboardView = new KeyboardItemView();
                this.keyboardRegion.show(this.keyboardView);
                
                this.listenTo(this.keyboardView, 'noteOn', this.noteOnHandler);
                this.listenTo(this.keyboardView, 'noteOff', this.noteOffHandler);
                this.listenTo(this.synth, 'change', this.synthUpdateHandler);
            },
            
            noteOnHandler: function(note, frequency) {
                var voice = new Voice({
                    frequency: this.synth.getCurrentRange(frequency),
                    waveform: this.synth.getCurrentWaveforms(),
                    vcfFreq: this.synth.get('vcf-freq'),
                    res: this.synth.get('vcf-res'),
                    envelope: this.synth.getCurrentEnvelope(),
                    maxLevel: this.synth.get('vca-level'),
                    chorusLevel: this.synth.get('cho-chorusToggle'),
                    subLevel: this.synth.get('dco-sub'),
                    hpfFreq: this.synth.get('hpf-freq'),
                    vcfEnv: this.synth.get('vcf-env'),
                    lfo: this.lfo,
                    chorus: this.chorus
                });
                    
                voice.noteOn({
                    lfoRate: this.synth.get('lfo-rate'),
                    lfoPitch: this.synth.get('lfo-pitch'),
                    lfoDelay: this.synth.get('lfo-delay'),
                    lfoFreq: this.synth.get('lfo-freq'),
                    envelope: this.synth.getCurrentEnvelope()
                });
                
                this.activeVoices[note] = voice;
            },
            
            noteOffHandler: function(note) {
                this.activeVoices[note].noteOff();
                delete this.activeVoices[note];
            },
            
            synthUpdateHandler: _.throttle(function(update) {                    
                var param = Object.keys(update.changed)[0];
                var value = update.changed[param];
                var component = param.slice(0, 3);
                var method = param.slice(4);
                
                _.each(this.activeVoices, function(voice) {
                    if(voice[component] && _.isFunction(voice[component][method])) {
                        voice[component][method](value);
                    } else {
                        voice[component][method] = value;
                    }
                });
            }, 30)
            
        });
    });
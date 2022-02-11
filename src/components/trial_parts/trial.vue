<template>
<div>
  <div :class="{ 'example-trial': example }">
    <!-- fixation cross -->
    <img v-if="display_tableau === false" :src="require('@/assets/fixcross.png')" alt="Fixation cross" class="fixcross"/>
    <!-- show tableau otherwise -->
    <tableau v-else
      :stim-ref="stimRef"
      :focused-pane="focused_pane"
    ></tableau>
  </div>
  <!-- instructions: -->
  <div class="tableau" v-if="showInstructions">
    <p v-for="(n, p) in n_panes" :key="p" class="current-instructions">
      <span v-if="focused_pane === p" :class="[current_instructions]">{{current_instructions}}</span>
    </p>
  </div>
<p class="current-instructions" v-if="showInstructions && focused_pane === null">get ready...</p>
<p class="current-instructions" v-else-if="showInstructions && focused_pane === -1 && playing">pause</p>
<!-- <p v-if="example" v-html="current_instructions"></p> -->
</div>
</template>
<script>

import tableau from './tableau.vue'

// vendor library
import Pizzicato from 'pizzicato';

export default {
  name: 'trial',
  props: {
    stimRef: String, // which stimulus to display, in abbreviated notation
    example: {
      type: Boolean,
      default: false
    },
    currentlyPressedKeys: {
      type: Array,
      default: () => { return []; }
    },
    metronome_sound_path: {
      type: String,
      default: '/static/metronome.mp3'
    },
    showInstructions: {
      type: Boolean,
      default: false
    },
    needsResponse: {
      type: Boolean,
      default: false
    },
    // timing parameters (sound should match these):
    ms_isi: { // number of ms to wait after metronome start to display stimulus
      type: Number,
      default: 1000
    },
    ms_per_slow_pane: { // length of slow pane
      type: Number,
      default: 4000
    },
    ms_per_fast_pane: { // length of fast pane
      type: Number,
      default: 2000
    },
    ms_count_in: { // length of count in (before panes start being highlighted)
      type: Number,
      default: 4000
    },
    n_slow_reps: { // number of repetitions of the tableau at slow speed
      type: Number,
      default: 1
    },
    n_fast_reps: { // number of repetitions of the tableau at fast speed
      type: Number,
      default: 3
    },
    keys_in_pane: { // color of keys in pane
      type: Array,
      default: () => { return ['red', 'blue', 'gray'] }
    }
  },
  components: {
    tableau
  },
  data: () => {
    return {
      focused_pane: null,
      display_tableau: false,
      playing: false,
      metronome: null,
      isi: 1000, // interstimulus interval, in ms
      n_panes: 0,
      current_instructions: "",
      keys_pressed_during_trial: [],
      start_time: null
    }
  },
  methods: {
    load_metronome: function() {
      // load sound
      let vue_instance = this;
      let loaded_sound = new Pizzicato.Sound(
        {
          source:'file',
          options: {
            path: vue_instance.metronome_sound_path,
            loop: false
          }
        },
        // when sound is loaded...
				() => {

          console.log("sound loaded")

          loaded_sound.on("play", () => {
            vue_instance.run_trial()
          })

          // play sound, after a brief delay
          setTimeout(() => {
            loaded_sound.play();
          }, this.ms_isi )

        })

        return loaded_sound;
    },
    run_trial: function() {
      this.playing = true
      this.start_time = new Date(); // log start time
      console.log("trial started at " + this.start_time)

      // display tableau
      this.display_tableau = true;

      // start moving focus, after the count-in
      setTimeout(this.animate_panes, this.ms_count_in)

      // end of trial
      setTimeout(() => {
        // show fixation cross again
        this.display_tableau = false
        this.playing = false;

        // check for no response
        if (this.keys_pressed_during_trial.length === 0 && this.needsResponse === true) {
          this.$emit('no-keys-pressed')
          console.log("emitted no keys pressed")
        }

        // emit done event
        this.$emit('done', {
          start_time: this.start_time,
          keypresses: this.keys_pressed_during_trial
        })

      }, this.n_panes * (
          this.ms_per_slow_pane * this.n_slow_reps
          + this.ms_per_fast_pane * this.n_fast_reps
        ) + this.ms_count_in)

    },
    animate_panes: function() {

      // immediate intervals (slow)
      this.focused_pane = 0;
      this.move_focus(
        this.n_panes * this.n_slow_reps,
        this.ms_per_slow_pane / (this.keys_in_pane.length + 1)
      )

      // delayed intervals (fast)
      setTimeout(() => {
        this.move_focus(
          this.n_panes * this.n_fast_reps,
          this.ms_per_fast_pane / (this.keys_in_pane.length + 1)
        );
      }, this.n_panes * this.n_slow_reps * this.ms_per_slow_pane)
    },
    move_focus: function(maximum_panes, frequency) {
      let counter = -1;
      let interval_id = null;
      let vm = this;

      let shift_focus = function() {
        counter++;

        if (counter < maximum_panes * (vm.keys_in_pane.length + 1) - 1) {
          if (counter % (vm.keys_in_pane.length + 1) !== vm.keys_in_pane.length) {
              vm.current_instructions = vm.keys_in_pane[counter % (vm.keys_in_pane.length + 1)]
              vm.focused_pane = Math.floor(counter / (vm.keys_in_pane.length + 1)) % vm.n_panes;
          } else {
            vm.focused_pane = -1;
            vm.current_instructions = ""
          }
        } else {
          // self-destruct
          vm.focused_pane = -1;
          vm.current_instructions = ""
          clearInterval(interval_id);
        }
      }

      shift_focus();
      interval_id = setInterval(
        shift_focus,
        frequency
      )
    },
    log_key: function(key) {
      let current_time = new Date()
      this.keys_pressed_during_trial.push({
        'key': key,
        'time': current_time
      })
    }
  },
  created: function() {
    // initialize number of panes in stimulus
    this.n_panes = this.stimRef.split(" ").length
    this.load_metronome();
  },
  watch: {
    currentlyPressedKeys(newValue, oldValue) {

      // only log keys while trial is playing
      if (this.playing === true) {

        let difference = function(arrayA, arrayB) {
            let setA = new Set(arrayA)
            let setB = new Set(arrayB)

            const diff = new Set(setA);

            for (const elem of setB) {
                diff.delete(elem);
            }

            return diff;
        }

        let new_keys = difference(newValue, oldValue)
        if (new_keys.size > 0) {
          new_keys.forEach(this.log_key)
        }

      }
    }
  }
}

</script>

<template>
<div>
  <p v-for="(para, p) in paragraphs" :key="p" v-html="para"></p>

  <img v-if="image != ''" :src="require('@/assets/'+image)" />

  <tableau
    v-if="Object.keys(tableau).length !== 0 && tableau.playable === false"
    :stim-ref="tableau.stimRef"
  ></tableau>
  <trial
    v-else-if="tableau.playable === true"
    :example="true"
    :stim-ref="tableau.stimRef"
    :show-instructions = "tableau.pane_by_pane_instructions === true"
    :currently-pressed-keys = "currentlyPressedKeys"
    :needs-response = "tableau.needs_response"
    @done="trial_played = true"
    @no-keys-pressed="error_made = true"
    ref="currentTrial"
  ></trial>

  <p v-if="completionCondition.sequence.length > 0 && (tableau.playable !== true || (trial_played === true && error_made === false))" v-html="completionCondition.text"></p>
  <button v-if="completionCondition.sequence.length == 0" v-html="completionCondition.text" @click="complete"></button>

  <p v-if="error_made" v-html="'<b>' + error_message + '</b>'"></p>
</div>
</template>
<script>
import tableau from '../trial_parts/tableau.vue'
import trial from '../trial_parts/trial.vue'


export default {
  name: 'instructionMod',
  props: {
    paragraphs: Array,
    image: {
      type: String,
      default: ""
    },
    tableau: {
      type: Object,
      default: () => { return {} }
    }, // for displaying tableau panes
    completionCondition: Object,
    errorMessage: {
      type: String,
      default: "That's not quite right! Go ahead and try again, starting from the beginning."
    },
    currentlyPressedKeys: Array
  },
  components: {
    tableau,
    trial
  },
  data: () => {
    return {
      error_message: "",
      error_made: false,
      keys_pressed: [],
      trial_played: false
    }
  },
  methods: {
    complete() {
      // check whether errors have been made, refresh state if they have
      if ( this.tableau.playable === true && this.error_made === true) {
        console.log("forcing update here")
        this.error_made = false; // reset error logger
        this.trial_played = false; // reset log
        this.$refs.currentTrial.load_metronome();
      } else {
        this.$emit('advance');
        this.keys_pressed = [];
      }
    },
    arraysAreEqual(array1, array2) {
      return array1.length === array2.length && array1.every(function(value, index) { return value === array2[index]})
    },
    setsAreEqual(array1, array2) {
      let set1 = new Set(array1)
      let set2 = new Set(array2)

      // easiest to compare by size first
      if (set1.size !== set2.size) {
        return false;
      }

      return Array.from(set1).every(element => {
        return set2.has(element);
      });

    }
  },
  created: function() {
    this.error_message = this.errorMessage

    if (this.tableau.playable === true && this.tableau.needs_response === true) {
      this.error_message += " Press both thumbs to try again."
    }
  },
  watch: {
    currentlyPressedKeys(newValue, oldValue) {
        // don't evaluate until we're ready to evaluate
        if (this.tableau.playable !== true || this.trial_played === true) {

          // simultaneous evaluation
          if (this.completionCondition.simultaneous === true) {

            if (this.setsAreEqual(newValue, this.completionCondition.sequence)) {
              this.complete();
            }

          // sequential evaluation
          } else {

            // add to keys pressed
            if (newValue.length != 0 && newValue.length > oldValue.length) {
              this.keys_pressed.push(newValue[0])

              // check for completeness
              // success condition
              if (this.arraysAreEqual(this.keys_pressed, this.completionCondition.sequence)) {
                this.complete();

              } else if (this.keys_pressed.length <= this.completionCondition.sequence.length && this.keys_pressed.length > 0) {

                // check for valid subsequence
                if (this.arraysAreEqual(this.keys_pressed, this.completionCondition.sequence.slice(0, this.keys_pressed.length))) {
                  this.error_made = false;
                } else {
                  console.log("not right")
                  this.error_made = true;

                  // clear keys pressed
                  this.keys_pressed = [];
                }
              }
            }
          }
        }

    }
  }
}

</script>

<template>

<div class="instructions">
  <div v-for="(module, m) in modules" :key="m">
    <instruction-mod
      v-if="current_module === m"
      :paragraphs = "module.text"
      :completion-condition = "completionConds[m]"
      :image = "module.image"
      :tableau = "module.tableau"
      :currently-pressed-keys = "currentlyPressedKeys"
      :error-message = "module.errorMessage"
      @advance="nextModule()"
    ></instruction-mod>
  </div>
</div>

</template>
<script>
import instructionMod from './instruction_parts/instruction_module.vue'

export default {
  name: 'instructions',
  components: {
    instructionMod
  },
  props: {
    expLen: Number,
    day: Number,
    fingersToKeys: Object,
    keyPressed: String,
    currentlyPressedKeys: Array
  },
  data: () => {
    return {
      current_module: 0, // initialize current module at 0
      modules: [ // list of modules to show
        {
          text: [
            'Welcome! In this part of the session, we\'ll be setting up your equipment for the experiment.',
            "Important: please DO <b>NOT</b> use the back button or refresh the study at any point during this experiment—you will lose your place!",
            "At this time, please:<ul><li>make sure you are in a quiet place where you will not be disturbed for at least an hour, with a flat desk surface large enough for the provided external keyboard</li><li>connect your headphones</li><li>maximize your browser window</li></ul>"
          ],
          completionCondition: {
            sequence: [],
            simultaneous: null,
            text: 'I am in a quiet place, my headphones are connected, and my browser window is maximized.'
          }
        },
        {
          text: [
            'Great! Now it\'s time to connect the provided external keyboard to your computer\'s USB port.',
            'Once connected, please turn the keyboard <b>upside-down</b>, so that the space bar is facing <i><b>away</b></i> from you, and put all your fingers except your pinkies on the stickered keys, as shown:'
          ],
          image: "keyboard-hands.jpeg",
          completionCondition: {
            sequence: ['left ring finger', 'left middle finger', 'left index finger', 'left thumb', 'right thumb', 'right index finger', 'right middle finger', 'right ring finger'],
            simultaneous: false,
            text: 'You\'ll be keeping your fingers in the same position for the duration of the experiment.</p><p>To continue, please press all 8 stickered keys one by one, from left to right (starting with your left ring finger and ending with your right ring finger).'
          }
        },
        {
          text: [
            'Awesome! Please keep your fingers in the current position for the duration of the experiment, and DO NOT navigate away from your browser window.',
            'In this experiment we\'ll be asking you to key in sequences of nine buttons in a specific order. Each sequence will appear as a set of three panes, like this:'
          ],
          tableau: {
            stimRef: "iRtLiL mLtLiR rRtLmR",
            playable: false
          },
          completionCondition: {
            sequence: ['left thumb', 'right thumb'],
            simultaneous: true,
            text: "Please press both thumbs to continue."
          }
        },
        {
          text: [
            'Within each pane, we\'d like you to press the three colored buttons in a specific order:',
            '<ol> \
              <li><span class="red">red</span></li> \
              <li><span class="blue">blue</span></li> \
              <li><span class="gray">gray</span></li> \
            </ol>',
            'Let\'s zoom in on the first pane as an example.'
          ],
          tableau: {
            stimRef: "iRtLiL",
            playable: false
          },
          completionCondition: {
            sequence: [],
            simultaneous: false,
            text: "Try it for yourself, by pressing the keys in order."
          }
        },
        {
          text: [
            'Now try the whole sequence, from left to right. Remember: <span class="red">red</span> first, then <span class="blue">blue</span>, then <span class="gray">gray</span>.'
          ],
          tableau: {
            stimRef: "iRtLiL mLtLiR rRtLmR",
            playable: false
          },
          completionCondition: {
            sequence: [],
            simultaneous: false,
            text: "From time to time during the experiment, we'll remind you of this order."
          }
        },
        {
          text: [
            "Excellent! That's how sequences will be displayed in the experiment.",
            "On each trial, we'll ask you to key in each 3-pane sequence four times, to the beat of a metronome. \
            First, you'll hear four \"count-in\" beats. Then the metronome will play \
              for one repetition of the sequence slowly, and then three times fast.",
            "Each pane will be highlighted with a yellow border when it's time to key it in, like this:"
          ],
          tableau: {
            stimRef: "iRtLiL mLtLiR rRtLmR",
            playable: false,
            highlighted_pane: 0
          },
          completionCondition: {
            sequence: ['left thumb', 'right thumb'],
            simultaneous: true,
            text: "When the pane is highlighted, you will hear three low beats and one high beat.\
             Press each key in order \
             (<span class='red'>red</span>-<span class='blue'>blue</span>-<span class='gray'>gray</span>) \
             on each low beat, and pause between panes on the high beat. Please do your best to keep up \
             with the metronome! If you make a mistake, do not go back to correct yourself.</p>\
             <p>Press both thumbs to see and hear an example of this; feel free to\
             adjust your volume to make sure you can comfortably hear the metronome.\
             <b>Note: the text you'll see under the example is just for illustration,\
             and will not appear in the experiment.</b>"
          }
        },
        {
          text: [""],
          tableau: {
            stimRef: "iRtLiL mLtLiR rRtLmR",
            playable: true,
            pane_by_pane_instructions: true
          },
          completionCondition: {
            sequence: ['left thumb', 'right thumb'],
            simultaneous: true,
            text: "Next, let's try a different sample trial with the metronome. Remember, do your best to keep up with the metronome, and <b>do NOT</b> go back to correct yourself if you make a mistake.</p>\
            <p>When you're ready to continue, press both thumbs. The trial will start automatically, and the text you saw below the box won't appear on this next trial."
          }
        },
        {
          text: ["Try this one on your own:"],
          tableau: {
            stimRef: "mRtRrL rRtRiL mLtRiR",
            playable: true,
            needs_response: true
          },
          completionCondition: {
            sequence: ['left thumb', 'right thumb'],
            simultaneous: true,
            text: "Looks like you've got the hang of it!</p><p>Press both thumbs to continue to the experiment. The first trial will start automatically."
          },
          errorMessage: "We didn't get any keypresses from you."
        }
      ],
      keyAbbrevs: {
        'R': 'right',
        'L': 'left',
        't': 'thumb',
        'i': 'index finger',
        'r': 'ring finger',
        'm': 'middle finger'
      }
    }
  },
  methods: {
    mapToKey(finger) {
      return this.$props.fingersToKeys[finger]
    },
    nextModule() {
      //advance view to next module
      if (this.current_module < this.modules.length - 1) {
        this.current_module++;
      } else {
        console.log("END OF INSTRUCTIONS")
        this.$emit('advance');
      }
    }
  },
  computed: {
    completionConds() {
        let cc = []

        for (let m = 0, len = this.modules.length; m < len; m++) {
          cc[m] = {
            sequence: [],
            simultaneous: this.modules[m].completionCondition.simultaneous,
            text: this.modules[m].completionCondition.text
          }

          if (this.modules[m].completionCondition.sequence.length === 0) {

            // map stimuli notation to keys
            if (this.modules[m].tableau != undefined) {

              let panes = this.modules[m].tableau.stimRef.split(" ")
              panes.map((pane) => {
                for (let index = 0; index < pane.length; index += 2) {
                  cc[m].sequence.push(pane.slice(index, index + 2))
                }
              })

              let vm = this;
              cc[m].sequence = cc[m].sequence.map((key_abbreviation) => {
                //return key_abbreviation[1] + " " + key_abbreviation[0];
                return vm.mapToKey([
                  vm.keyAbbrevs[key_abbreviation[1]]
                  + " "
                  + vm.keyAbbrevs[key_abbreviation[0]]
                ]);
              })

            }

          } else {

            for (let k = 0, seq_len = this.modules[m].completionCondition.sequence.length; k < seq_len; k++) {
              cc[m].sequence.push(this.mapToKey(this.modules[m].completionCondition.sequence[k]))
            }

          }
        }

        return cc
    }
  }
}
</script>

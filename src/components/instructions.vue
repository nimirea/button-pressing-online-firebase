<template>

  <div class="instructions">

    <h1><!--Task {{currentTask + 1}} of {{taskList.length}}:-->Equipment Setup and Instructions</h1>

    <!-- <div v-for="(module, m) in modules" :key="m">
      <instruction-mod
        :paragraphs = "module.text"
        :completion-condition = "completionConds[m]"
      ></instruction-mod>
    </div> -->
    <instruction-mod
      :paragraphs = "modules[current_module].text"
      :completion-condition = "completionConds[current_module]"
      :image = "modules[current_module].image"
      :tableau = "modules[current_module].tableau"
      :currently-pressed-keys = "currentlyPressedKeys"
      @advance="nextModule()"
    ></instruction-mod>

  <!-- keyboard check
  <div v-if="!expOver & taskList[currentTask].name == 'equipment_setup'">


    <p>
      Welcome! In this part of the session, we'll be setting up your equipment
      for the experiment.
    </p>

    <p>
      Important: please DO <b>NOT</b> use the back button or
      refresh the study at any point during this experiment—you will lose your
      place!
    </p>

    <p>You will need headphones for this experiment. Please connect them now,
      and make sure you are in a quiet place where you won't be disturbed for
      about 1 hour. You will also need a flat desk surface large enough for
      your external keyboard.
    </p>

      <button
        v-on:click="taskList[currentTask].data.headphonesConnected = true; scrollDown();"
        v-bind:class="{
                        active: taskList[currentTask].data.headphonesConnected === true
                      }"
      >My headphones are connected, and I am in a quiet place with a suitable surface.</button>

    <div v-if="taskList[currentTask].data.headphonesConnected == true">

      <p>At this time, please connect the external keyboard you were given to
        your computer's USB port, and <b>turn it upside-down</b>, so that
        the row of removed keys is closest to you, and the space bar is facing <em>away</em> from you, like so:</p>

      <img src="./assets/keyboard-no-hands.jpeg" />

      <button
        v-on:click="taskList[currentTask].data.keyboardConnected = true;
          taskList[currentTask].stimList = makeKeyTrials();
          startKeyTrial(taskList[currentTask].stimList[0]);
          scrollDown();"
        v-bind:class="{
                        active: taskList[currentTask].data.keyboardConnected === true
                      }"
      >The external keyboard is connected and upside-down.</button>

    </div>

    <div v-if="taskList[currentTask].data.keyboardConnected == true">

      <p>Please put your thumbs and all fingers except your pinkies on the keys that are covered with stickers,
        as shown:</p>

      <img src="./assets/keyboard-hands.jpeg" />

      <p v-for="(trial, index) in taskList[currentTask].stimList.slice(0, currentStim + 1)" :key="index">
        <span v-if="index == 0">
          When you are ready, please
        </span>
        <span v-else>Great! Now </span>
          press the key beneath your <b>{{ keysToFingers[trial.correct_answer] }}</b>.
      </p>
      <p v-if="currentKeyTrial != null && currentKeyTrial.is_correct === false">That wasn't quite right... please look at the example image above and try again.</p>

      <p v-if="taskList[currentTask].stimList[taskList[currentTask].stimList.length - 1].is_correct == true">
        Awesome, well done! Looks like you're ready for the next step. Please press down on both thumbs for {{ thumbPressSecs }} seconds to continue.
      </p>

    </div>


  </div>

  <div v-if="!expOver && taskList[currentTask].name == 'button-pressing'">
    <div v-if="!isStarted">
      <h1>Task {{currentTask + 1}} of {{taskList.length}}: Button-Pressing Task</h1>
      <p>
        In this experiment, we will be asking you to key in sequences of nine
        buttons in a specific order. Each sequence will appear as a set of three panes, like below:
      </p>

      <div class="example-trial">
        <div class="tableau">
          <img v-for="pane_img in breakIntoPanes(taskList[currentTask].sample_trials[0].stim)"
            :key="pane_img"
            :src="pane_img" class="pane"/>
        </div>
      </div>
      <p>
        Within each pane, we'd like you to press the three colored buttons in a specific order:
      </p>
      <ol>
        <li><span class="red">red</span></li>
        <li><span class="blue">blue</span></li>
        <li><span class="gray">gray</span></li>
      </ol>
      <p>
        Let's zoom in on the first pane as an example. Which buttons should you press, and in what order?
      </p>
      <div class="tableau"><img class="pane" :src="breakIntoPanes(taskList[currentTask].sample_trials[0].stim)[0]" /></div>
      <ol>
        <li><span class="red">red</span>: <b>left index finger</b></li>
        <li><span class="blue">blue</span>: <b>left thumb</b></li>
        <li><span class="gray">gray</span>: <b>right index finger</b></li>
      </ol>

      <p>Go ahead and try the second pane on your own:</p>
      <div class="tableau"><img class="pane" :src="breakIntoPanes(taskList[currentTask].sample_trials[0].stim)[1]" /></div>

      <div v-if="taskList[currentTask].stimList[0].is_correct === true">
        <p>Great job!</p>

        <p>Now try all the panes together, from left to right:</p>
        <div class="example-trial">
          <div class="tableau">
            <img v-for="pane_img in breakIntoPanes(taskList[currentTask].sample_trials[0].stim)"
              :key="pane_img"
              :src="pane_img" class="pane"/>
          </div>
        </div>
      </div>

      <div v-if="taskList[currentTask].stimList[1].is_correct === true">
        <p>Excellent! This is how sequences will be displayed in the experiment.</p>

        <p>
          In the experiment, we'll ask you to key in each sequence four times, to the beat of a metronome.
        </p>

        <p>
          On each trial, after four "count-in" beats, the metronome will play
          for one repetition of the sequence slowly, and then three times fast.
          Each pane will be highlighted with a yellow border when it's time to key it in.
        </p>

        <p>
          While the pane is highlighted, please press each key in order on the three low beats, and pause between panes on the high beats.
          Each repetition of the sequence (3 panes with 3 presses and 1 pause each) should take 12 beats.
        </p>

        <p>Press both thumbs for {{ thumbPressSecs }} seconds to see and hear an example of this, with explanations below the frame.</p>

        <div class="example-trial">
          <div v-if="taskList[currentTask].sample_trials[0].isPlaying === false && currentStim === 2" class="stim">
            <img src="./assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
          </div>
          <div v-else class="tableau">
            <img v-for="(pane_img, pane_idx) in breakIntoPanes(taskList[currentTask].sample_trials[0].stim)"
              :key="pane_img"
              :src="pane_img" class="pane" :class="{ 'on-beat': pane_idx == taskList[currentTask].stimList[2].focused_pane }"/>
          </div>
        </div>
        <p class="instruction-text">{{ taskList[currentTask].stimList[2].instruction_text }}</p>

      </div>

      <div v-if="taskList[currentTask].sample_trials[0].played === true">
        <p>Now it's your turn. Press both thumbs for {{ thumbPressSecs }} seconds to start the sample trial.</p>

        <div class="example-trial">
          <div v-if="taskList[currentTask].sample_trials[0].isPlaying === false" class="stim">
            <img src="./../assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
          </div>
          <div v-else class="tableau">
            <img v-for="(pane_img, pane_idx) in breakIntoPanes(taskList[currentTask].sample_trials[0].stim)"
              :key="pane_img"
              :src="pane_img" class="pane" :class="{ 'on-beat': pane_idx == taskList[currentTask].stimList[3].focused_pane }"/>
          </div>
        </div>

      </div>

      <p v-if="currentKeyTrial != null && currentKeyTrial.is_correct === false">Not quite... go ahead and start over from the beginning.</p>

      <div v-if="taskList[currentTask].stimList[3].is_correct === true">
      <p>Important notes:</p>

      <ul>
        <li>
          Please do your best to keep up with the metronome! If you make a
          mistake, DO <b>NOT</b> go back to correct yourself.
        </li>
        <li>
          Please perform this task <b>with your headphones on</b>. Feel free to adjust your
          volume to make sure you can comfortably hear the metronome.
        </li>
      </ul>

        <p>
          This task should last approximately {{ stimList.length * .5 }}
          minutes. Your keystrokes will be stored and uploaded for analysis.
        </p>

        <p>Press both thumbs for {{ thumbPressSecs }} seconds to continue.</p>
      </div>
    </div>

  </div>

-->
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
            text: 'You\'ll be keeping your fingers in the same position for the duration of the experiment.</p><p>To continue, please press each finger on the stickered keys one by one, from left to right (starting with your left ring finger and ending with your right ring finger).'
          }
        },
        {
          text: [
            'Awesome! Please keep your fingers in the current position for the duration of the experiment.',
            'In this experiment we\'ll be asking you to key in sequences of nine buttons in a specific order. Each sequence will appear as a set of three panes, like this:'
          ],
          tableau: "iLtLiR mLtLiR rRtLmR",
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
          tableau: "iLtLiR",
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
          tableau: "iLtLiR mLtLiR rRtLmR",
          completionCondition: {
            sequence: [],
            simultaneous: false,
            text: ""
          }
        },
        {
          text: [
            "Excellent! This is how sequences will be displayed in the experiment.",
            "In the experiment, we'll ask you to key in each sequence four times, to the beat of a metronome.",
            "On each trial, after four \"count-in\" beats, the metronome will play \
              for one repetition of the sequence slowly, and then three times fast. \
              Each pane will be highlighted with a yellow border when it's time to key it in.",
            "While the pane is highlighted, please press each key in order on the three low beats, and pause between panes on the high beats. \
             Each repetition of the sequence (3 panes with 3 presses and 1 pause each) should take 12 beats."
          ],
          completionCondition: {
            sequence: ['left thumb', 'right thumb'],
            simultaneous: true,
            text: "Please press both thumbs to see and hear an example of this."
          }
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

              let panes = this.modules[m].tableau.split(" ")
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

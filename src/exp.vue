<template>
  <div id="app" v-cloak>

    <!-- check for outdated browser -->
    <div v-if="browserOutdated">
      <h1>Unsupported browser</h1>
      <p>It appears you are using an unsupported browser. Please open this page in Edge, Firefox, or Chrome to continue.</p>
    </div>

    <!-- check if the day value is a valid value -->
    <div v-else-if="day > 4 || Number.isNaN(day) || day < 1">
      <h1>Invalid URL</h1>
      <p>Are you sure that you're in the right place? Please make sure you've clicked the correct link, and send a message to your experimenter if the issue persists.</p>
    </div>

    <!-- check if participants CAN continue to the next day -->
    <div v-else-if="prevDayIncomplete & day != 1">
      <h1>Previous day not completed</h1>
      <p>You must complete all sessions in order. If you completed Day {{ day - 1 }} already, please send a message to your experimenter.</p>
    </div>

    <div v-else-if="alreadyDone">
      <h1>Already completed this session</h1>
      <p>You have already completed this session. Did you click on the previous day's link?</p>
    </div>

    <div v-else-if="timingCorrect == 'early'">
      <h1>Too early</h1>
      <p v-if="timingCorrect == 'early'">Please refresh this page in {{ timeRemainingString }}.</p>
    </div>

    <div v-else-if="timingCorrect === 'just right'">

    <p v-if="waitText != ''" class="loading-dots">{{ waitText }}</p>

    <!-- instructions -->
    <instructions
      :exp-len="48"
      :day="day"
      :fingers-to-keys="fingersToKeys"
      :key-pressed="lastKeypress.key"
      :currently-pressed-keys="currentlyPressedKeys.map((item) => {return item.key })"
    ></instructions>

    <!-- actual trials -->
      <div v-if="isStarted" class="stim">
        <div v-if="!trialEnded && stimVisible" class="tableau">
          <img v-for="(pane_img, pane_idx) in breakIntoPanes(stimList[currentStim]['twister'])"
            :key="pane_img"
            :src="pane_img" class="pane" :class="{ 'on-beat': pane_idx == keypress_stimlist[currentStim].focused_pane }"/>
        </div>
        <div v-else>
          <img src="./assets/fixcross.png" alt="Fixation cross" class="fixcross"/>
        </div>
        <p v-if="trialEnded">press both thumbs for {{ thumbPressSecs }} seconds to continue</p>
      </div>
    </div>

    <!--post-task survey-->
    <div v-if="taskList[currentTask].name == 'survey' && expOver === false">
    <h1>Task {{currentTask + 1}} of {{taskList.length}}: Post-Task Survey</h1>
    <post-task-survey
      :ppt-id='participant_id'
      :day='day'
      @submit='stopTask'>
    </post-task-survey>
    </div>

    <!-- experiment over -->
    <div v-if="expOver">
      <p>Your response has been successfully submitted!</p>
      <p v-if="day != 2">You will receive an email shortly with a link to tomorrow's session. Please click the link after {{ timeRemainingString }}, and be sure to get a full night's sleep (while wearing your Fitbit) before your next session.</p>
      <p v-else>Thank you for your participation in this experiment! We look forward to seeing you at your equipment drop-off appointment.</p>
    </div>
  </div>
</template>

<script>
// import eligibilitySurvey from './components/eligibility-survey.vue'
// import consentForm from './components/consent-form.vue'
// import booking from './components/booking.vue'
// import textboxQuestion from './components/form_parts/textbox-question.vue'
import postTaskSurvey from './components/posttask-survey.vue'
import instructions from './components/instructions.vue'

// Initialize Cloud Functions through Firebase
import { fb_functions } from "./fb_init.js"

// vendor libraries
import Papa from 'papaparse';
import Pizzicato from 'pizzicato';

export default {
  name: 'ExperimentSession',
  components: {
    instructions,
    postTaskSurvey
  },
  data: function() {
    return {
      stream: {},
      snd: {}, // sound to be played
      analyserNode: {}, // volume meter
      fingersToKeys: {
        'left thumb': "8",
        'right thumb': "6",
        'left index finger': "k",
        'right index finger': "g",
        'left middle finger': ",",
        'right middle finger': "v",
        'left ring finger': ".",
        'right ring finger': "c"
      },
      isStarted: false, // has the experiment started?
      isRecording: false, // are we currently recording?
      stimList: [{'twister': ''}], // list of stimuli for button-pressing task
      currentStim: 0, // keep track of which stimulus should be shown
      isi: 1000, // interstimulus interval, in ms
      stimVisible: false,
      rejected: false, // declined to participate
      trialEnded: false, // button-pressing task
      expOver: false,
      taskList: [ // tasks, in order
        {
          name: 'equipment_setup',
          data: {
            headphonesConnected: null,
            keyboardConnected: null
          }
        },
        {
          name: 'button-pressing'
        },
        {
          name: 'survey'
        }
      ], // task info, in order of appearance
      currentTask: 0, // keeps track of which task is active
      recordingDDK: false, // whether DDK task is recording
      participant_id: null,
      exp_cond: null, // experiment condition (onset, coda-onset, or coda-coda)
      cb_cond: null, // counterbalancing condition
      exp_length: null, // experiment length, will depend on URL parameter
      surveySubmitted: false, // whether ending survey has been submitted or not
      surveyData: { }, // data for the survey at the end
      stq: { }, // sleep timing questionnaire
      perfectFormState: false, // checking whether the survey is valid
      errorCounts: { }, // for storing errors for each input
      test_mode: null, // whether to use a smaller stimulus list ('yes' = use smaller)
      timeRemainingString: null,
      minsRemaining: null,
      timingCorrect: null, // whether the timing is correct or not (set based on minsRemaining, possible values are early, just right)
      prevDayIncomplete: false, // did the participant complete the previous day?
      alreadyDone: false, // did the participant already complete THIS day?
      browserOutdated: false,
      completionURL: null,
      completionErrors: false,
      lastKeypress: {
        timestamp: null,
        key: null
      },
      keypress_stimlist: [],
      currentKeyTrial: null,
      currentlyPressedKeys: [],
      thumbPressSecs: 2,
      waitText: "",
      thumbWaitInterval: null,
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
  computed: {
    keysToFingers: function () {
      // `this` points to the vm instance
      let result = {}

      for (var finger in this.fingersToKeys) {
        result[this.fingersToKeys[finger]] = finger
      }

      return result;
    }
  },
  methods : {
    scrollDown: function() {
      this.$nextTick(function () {
        document.getElementById("app").scrollIntoView({ behavior: 'smooth' , block: 'end'});
      })
      return;
    },
    breakIntoPanes: function(stim_text) {
      let result = stim_text.split(" ");
      let images = require.context('./assets/stimuli-img', false, /\.png$/);
      result = result.map((pane) => {
        return images('./' + pane + ".png")
      })

      return result;
    },
    shuffle: function (array) {
      // Knuth shuffle (in-place)
      // from: https://stackoverflow.com/a/2450976

      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    },
    makeKeyTrials: function(params = {
      keys: Object.values(this.fingersToKeys),
      randomize: true,
      from_stim: false,
      error_checking: ['keys']
    }) {
      let keys = params.keys;
      let from_stim = params.from_stim;
      let randomize = params.randomize;
      let result = [];

      if (from_stim === true) {
        let chunk_size = 2
        for (let stim_idx = 0; stim_idx < keys.length; stim_idx += 1) {
          console.log(keys[stim_idx])
          let split_arr = keys[stim_idx].split(" ")
          let keys_in_stim = []
          split_arr.map((pane) => {
            for (let index = 0; index < pane.length; index += chunk_size) {
              keys_in_stim.push(pane.slice(index, index + chunk_size))
            }
          })

          let vm = this;
          keys_in_stim = keys_in_stim.map((key_abbreviation) => {
            //return key_abbreviation[1] + " " + key_abbreviation[0];
            return vm.fingersToKeys[
              vm.keyAbbrevs[key_abbreviation[1]]
              + " "
              + vm.keyAbbrevs[key_abbreviation[0]]
            ];
          }).join('')

          result.push(keys_in_stim);
        }
      } else {
        result = keys;
      }

      result = result.map((key) => {
        return {
          start_time: null,
          correct_answer: key,
          responses: [],
          is_correct: null,
          wrong_tries: [],
          error_checking: params.error_checking,
          focused_pane: -1 // which pane is focused?
        }
      })

      if (randomize == true) {
        result = this.shuffle(result)
      }

      return result;
    },
    startKeyTrial: function(keyTrial) {
      this.currentKeyTrial = keyTrial
      this.currentKeyTrial.start_time = new Date()
    },
    endKeyTrial: function() {
      // record response within taskList
      this.taskList[this.currentTask].stimList[this.currentStim] = this.currentKeyTrial

      // set as correct if there's no error checking
      if (this.taskList[this.currentTask].stimList[this.currentStim].error_checking.length == 0) {
        this.taskList[this.currentTask].stimList[this.currentStim].is_correct = true;
      }

      if (this.currentStim < this.taskList[this.currentTask].stimList.length - 1) {
        this.startKeyTrial(this.taskList[this.currentTask].stimList[this.currentStim + 1]);
        this.currentStim += 1;
      } else {
        this.currentKeyTrial = null;
      }

    },
    checkCurrentKeyTrial: function() {
      let lr = {};
      Object.assign(lr, this.lastKeypress)
      this.currentKeyTrial.responses.push(lr)

      let num_keys_attempted = this.currentKeyTrial.responses.length

      // check for correctness
      if (this.currentKeyTrial.error_checking.includes("keys")) {
        if (this.currentKeyTrial.responses[num_keys_attempted - 1].key == this.currentKeyTrial.correct_answer.slice(num_keys_attempted - 1, num_keys_attempted)) {

          // check for done
          if (this.currentKeyTrial.responses.length === this.currentKeyTrial.correct_answer.length) {
            this.currentKeyTrial.is_correct = true

            // end the key trial
            this.endKeyTrial(this.taskList[this.currentTask].keyTrialsList);

          } else {
            this.currentKeyTrial.is_correct = null;
          }

        } else {
          this.currentKeyTrial.is_correct = false

          // increment wrong tries
          this.currentKeyTrial.wrong_tries.push(this.currentKeyTrial.responses)

          // clear responses array
          this.currentKeyTrial.responses = [];
        }
      }

      // // check for timing
      // if (this.currentKeyTrial.error_checking.includes("timing")) {
      //
      // }

      this.$nextTick(function () {
        this.scrollDown();
      })

      return;
    },
    checkThumbs: function(_callback) {
      // double check that _callback is a function
      if (typeof _callback === 'function') {
        if (this.currentlyPressedKeys.map((k) => { return k.key }).includes(this.fingersToKeys['left thumb'])
          && this.currentlyPressedKeys.map((k) => { return k.key }).includes(this.fingersToKeys['right thumb'])
          && this.currentlyPressedKeys.length == 2
        ) {
          console.log("both thumbs pressed")
          let thumbResolution = 5
          this.waitText = "·".repeat(this.thumbPressSecs * thumbResolution)

          let latest_press_time = this.lastKeypress.timestamp
          let vm = this

          let interval_id = setInterval(
            function() {
              vm.waitText = vm.waitText.slice(0, -1); // remove last dot
              let current_time = new Date();
              let time_diff = current_time - latest_press_time
              if (time_diff >= vm.thumbPressSecs * 1000 ) {
                _callback();
                clearInterval(interval_id);
              }
            },
            1000 / thumbResolution
          )
        }

      }
    },
    keyFunction: function(keypress_event) {
      // what happens when a key is pressed?
      // console.log(keypress_event.key);

      // set as the last keypress
      this.lastKeypress.key = keypress_event.key;
      this.lastKeypress.timestamp = new Date();

      // add to currently pressed keys
      let lk = {};
      Object.assign(lk, this.lastKeypress)
      this.currentlyPressedKeys.push(lk);

      // if a keyTrial is happening:
      if (this.currentKeyTrial != null) {
        this.checkCurrentKeyTrial();
      }

      // if we're listening for thumbs
      let thumb_callback = 0;
      if ((("stimList" in this.taskList[this.currentTask] &&
          this.currentStim == this.taskList[this.currentTask].stimList.length - 1 &&
          this.taskList[this.currentTask].stimList[this.taskList[this.currentTask].stimList.length - 1].is_correct == true)) &&
          this.currentTask === 0) {

        thumb_callback = this.stopTask;
      } else if ("sample_trials" in this.taskList[this.currentTask]) {

        if ( this.taskList[this.currentTask].stimList[this.taskList[this.currentTask].stimList.length - 1].is_correct == true ) {
          thumb_callback = this.startTask;
        } else if (this.trialEnded === true && this.isStarted === true) {
          thumb_callback = this.nextTrial;
        } else {
          let vm = this;
          thumb_callback = function() {
            return vm.sampleTrial(0, vm.taskList[vm.currentTask].sample_trials[0].played);
          };
        }
      }
      this.checkThumbs(thumb_callback);

      return;

    },
    uploadData: fb_functions.httpsCallable('uploadData'),
    // function that starts the experiment
    startTask: function(){

      this.isStarted = true;
      this.currentStim = 0; // reset stim counter

      // create keypress list
      this.keypress_stimlist = this.makeKeyTrials(
        {
          keys: this.stimList.map((item) => {
            return item.twister;
          }),
          randomize: false,
          from_stim: true,
          error_checking: []
        }
      )

        // upload timestamp
        this.uploadData({
          'participant_id': 'ppt/' + this.participant_id,
          'day': this.day,
          'timestamp_name': 'startedTime'
        })

        // run first trial
        this.runTrial();


    },

    // stop task and continue to next one (or end the experiment, if we're all out of tasks)
    stopTask: function() {

      // end the whole experiment if we're all out of tasks
      if (this.currentTask == this.taskList.length - 1) {

        this.updateTimeRemaining(this.day, () => {
          this.expOver = true; // update view
        });

      } else {
        // advance to next task
        this.currentTask += 1;

        // reset Stim
        this.currentStim = 0;

        // make key trials for next task:
        if (this.taskList[this.currentTask].name == "button-pressing") {
          this.taskList[this.currentTask].stimList = this.makeKeyTrials({
            keys: [
              this.taskList[this.currentTask].sample_trials[0].stim.split(" ")[1],
              this.taskList[this.currentTask].sample_trials[0].stim,
            ],
            randomize: false,
            from_stim: true,
            error_checking: ['keys']
          }).concat(
            this.makeKeyTrials({
              keys: [
                this.taskList[this.currentTask].sample_trials[0].stim,
                this.taskList[this.currentTask].sample_trials[0].stim
              ],
              randomize: false,
              from_stim: true,
              error_checking: []
            })
          )
          this.startKeyTrial(
            this.taskList[this.currentTask].stimList[0]
          )
        }

        this.$nextTick(() => {
          document.body.scrollIntoView({ behavior: 'auto' , block: 'start'});
        })

      }
    },

    updateFormErrors: function(namedErrors) {
      // store data
      this.errorCounts[namedErrors['element_name']] = namedErrors['num_errors']

      // set perfectFormState based on this
      var errorSum = Object.values(this.errorCounts).reduce((a,b) => a + b);
      this.perfectFormState = (errorSum === 0 &&
        (Object.keys(this.stq).length === 18 || this.day > 1)
      );
    },

    // function that advances to next trial
    nextTrial: function() {
      // begin start of next trial (hide continue button)
      this.trialEnded = false;

      // advance stimulus
      this.currentStim += 1;

      // trial flow
      this.runTrial();
    },

    // function that runs the trial
			runTrial: function(){
      // import metronome sound (4 slow + 12 fast beats) as an object
				this.snd = new Pizzicato.Sound(
					{
						source:'file',
						options: {
							path: '/static/metronome.mp3',
							loop: false
						}
					},

        // when sound is loaded...
					() => {

          let vm = this;
          let trial_loop_interval_id = null;

          this.snd.on("play", () => {
            let sound_start_time = new Date();

            // change focus depending on the beat
            let slow_s_per_pane = 4;
            let fast_s_per_pane = 2;
            let n_fast_reps = 3;
            let panes_in_tableau = 3;
            let keys_per_pane = 3;
            let count_in_s = 4;
            let ms_in_s = 1000;


            trial_loop_interval_id = setInterval(() => {

              let currently_focused_pane = -1
              let elapsed_time = (new Date()) - sound_start_time

              // start assigning the focused pane
              if (elapsed_time > count_in_s * ms_in_s) {

                if (elapsed_time < (slow_s_per_pane * panes_in_tableau + count_in_s) * ms_in_s) {
                  // slow repetitions
                  let elapsed_time_in_slow_reps = elapsed_time - count_in_s * ms_in_s;
                  currently_focused_pane = parseInt((elapsed_time_in_slow_reps / ms_in_s) / slow_s_per_pane)

                  let beat = parseInt((elapsed_time_in_slow_reps / ms_in_s) % (keys_per_pane + 1))
                  // let key_color = ""
                  // if (beat == 0) {
                  //   key_color = "red"
                  // } else if (beat == 1) {
                  //   key_color = "blue"
                  // } else if (beat == 2) {
                  //   key_color = "gray"
                  // }

                  if ( beat == keys_per_pane ) {
                    currently_focused_pane = -1;
                  }

                } else if (elapsed_time < ((slow_s_per_pane + fast_s_per_pane * n_fast_reps) * panes_in_tableau + count_in_s) * ms_in_s) {
                  // fast repetitions
                  let elapsed_time_in_fast_reps = elapsed_time - (count_in_s + slow_s_per_pane * panes_in_tableau) * ms_in_s
                  currently_focused_pane = parseInt(((elapsed_time_in_fast_reps / ms_in_s) % (fast_s_per_pane * panes_in_tableau)) / fast_s_per_pane)

                  let beat = parseInt((elapsed_time_in_fast_reps / ms_in_s) * fast_s_per_pane % (keys_per_pane + 1))

                  if ( beat == keys_per_pane ) {
                    currently_focused_pane = -1;
                  }

                }

              }

              if (currently_focused_pane != vm.keypress_stimlist[vm.currentStim].focused_pane) {
                // console.log("elapsed time is : " + elapsed_time + " | we are changing the pane to " + currently_focused_pane)
                vm.keypress_stimlist[vm.currentStim].focused_pane = currently_focused_pane
              }

            }, 25)
          })

          // set what to do after the sound ends
          this.snd.on("end", () => setTimeout(() => {

            // stop trial loop
            clearInterval(trial_loop_interval_id)

            // go to next item, if it exists
            if (this.currentStim < this.stimList.length - 1) {

              // show continue button
              this.trialEnded = true;

              // hide stimulus in next trial
              this.stimVisible = false;

            } else {
              this.stopTask();
            }
          }, this.isi));

          setTimeout(() => {
            this.stimVisible = true;
          }, this.isi );

          this.snd.play();

        }
				);
			},

    // play sample trial
    sampleTrial: function(trial_idx, try_along = false) {
      if (!this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying) {
        var sampleSound = new Pizzicato.Sound(
            {
              source:'file',
              options: {
                path: '/static/metronome.mp3',
                loop: false
              }
            },

          // when sound is loaded, go through the trial flow
						() => {

            this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying = true;

            setTimeout(() => {
              this.stimVisible = true;
            }, this.isi);

            let trial_loop_interval_id = null;
            let vm = this;
            let taskList_stimList_idx = trial_idx + 2 // corresponds to the position of this trial in the taskList stimList, so we can keep track of which pane is focused
            if (try_along === true) {
              taskList_stimList_idx += 1;
            }

            vm.taskList[this.currentTask].stimList[taskList_stimList_idx].instruction_text = "count-in (4 beats)"


            sampleSound.on("play", () => {
              let sound_start_time = new Date();

              // change focus depending on the beat
              let slow_s_per_pane = 4;
              let fast_s_per_pane = 2;
              let n_fast_reps = 3;
              let panes_in_tableau = 3;
              let keys_per_pane = 3;
              let count_in_s = 4;
              let ms_in_s = 1000;


              trial_loop_interval_id = setInterval(() => {

                let currently_focused_pane = -1
                let elapsed_time = (new Date()) - sound_start_time
                let current_instruction_text = "count-in (4 beats)"

                // start assigning the focused pane
                if (elapsed_time > count_in_s * ms_in_s) {

                  if (elapsed_time < (slow_s_per_pane * panes_in_tableau + count_in_s) * ms_in_s) {
                    // slow repetitions
                    let elapsed_time_in_slow_reps = elapsed_time - count_in_s * ms_in_s;
                    currently_focused_pane = parseInt((elapsed_time_in_slow_reps / ms_in_s) / slow_s_per_pane)

                    let beat = parseInt((elapsed_time_in_slow_reps / ms_in_s) % (keys_per_pane + 1))
                    // let key_color = ""
                    // if (beat == 0) {
                    //   key_color = "red"
                    // } else if (beat == 1) {
                    //   key_color = "blue"
                    // } else if (beat == 2) {
                    //   key_color = "gray"
                    // }
                    current_instruction_text = "slow repetition: pane " + (currently_focused_pane + 1);

                    if ( beat == keys_per_pane ) {
                      currently_focused_pane = -1;
                      current_instruction_text = "pause"
                    }

                  } else if (elapsed_time < ((slow_s_per_pane + fast_s_per_pane * n_fast_reps) * panes_in_tableau + count_in_s) * ms_in_s) {
                    // fast repetitions
                    let elapsed_time_in_fast_reps = elapsed_time - (count_in_s + slow_s_per_pane * panes_in_tableau) * ms_in_s
                    currently_focused_pane = parseInt(((elapsed_time_in_fast_reps / ms_in_s) % (fast_s_per_pane * panes_in_tableau)) / fast_s_per_pane)

                    let beat = parseInt((elapsed_time_in_fast_reps / ms_in_s) * fast_s_per_pane % (keys_per_pane + 1))
                    current_instruction_text = "fast repetition: pane " + (currently_focused_pane + 1)

                    if ( beat == keys_per_pane ) {
                      currently_focused_pane = -1;
                      current_instruction_text = "pause"
                    }

                  }

                }

                if (currently_focused_pane != vm.taskList[this.currentTask].stimList[taskList_stimList_idx].focused_pane) {
                  // console.log("elapsed time is : " + elapsed_time + " | we are changing the pane to " + currently_focused_pane)
                  vm.taskList[this.currentTask].stimList[taskList_stimList_idx].focused_pane = currently_focused_pane
                }

                if (current_instruction_text != vm.taskList[this.currentTask].stimList[taskList_stimList_idx].instruction_text) {
                  vm.taskList[this.currentTask].stimList[taskList_stimList_idx].instruction_text = current_instruction_text
                }

              }, 25)
            })



            // reset the frame when the sound ends
            sampleSound.on("end", () => {
              this.stimVisible = false;
              this.taskList[this.currentTask].sample_trials[trial_idx].isPlaying = false;
              this.taskList[this.currentTask].sample_trials[trial_idx].played = true;

              // clear trial interval
              clearInterval(trial_loop_interval_id)

              // remove highlighting
              this.taskList[this.currentTask].stimList[taskList_stimList_idx].focused_pane = -1
              vm.taskList[this.currentTask].stimList[taskList_stimList_idx].instruction_text = ""

              // finish trial
              this.endKeyTrial()

              if (try_along === true) {
                // this.taskList[this.currentTask].sample_trials[trial_idx].completed = this.speechRecorded;
              }

            })

            // if (try_along === true) {
            //   // this.record(true, true);
            // }

            sampleSound.play();

          }
						);

      }
    },

    // push survey data and end the survey
    submitSurvey: function() {
      // data to push
      let push_data = {
        'participant_id': this.participant_id,
        'day': this.day,
        'surveyData': this.surveyData
      }
      // push stq if this is day 1
      if (this.day === 1) {
        push_data.ksq = this.ksq
      }

      this.uploadData(push_data)
      .then(() => {
        // update view
        this.stopTask();
      });


    },

    // calculate time remaining (update timeRemainingString and minsRemaining)
    // d = previous day
    // usually, you will want to do something with timeRemainingString / minsRemaining afterwards, so we have a callback
    updateTimeRemaining: function(d, _callback = () => { return null }) {

      var gct = fb_functions.httpsCallable('getStartTime');
      gct({
        participant_id: this.participant_id,
        day: d
      })
      .then((res) => {

        var lastTimestamp = res.data;

        if (lastTimestamp === null) {
          this.minsRemaining = 0
        } else {
          this.minsRemaining = 1440 - Math.floor((new Date().getTime() - lastTimestamp)/(1000*60));
        }

        var roundedHours = Math.floor(this.minsRemaining / 60)

        this.timeRemainingString = roundedHours + " hours";

        if (roundedHours * 60 < this.minsRemaining) {
          this.timeRemainingString = this.timeRemainingString + " and " + (this.minsRemaining - roundedHours * 60) + " minutes";
        }

      }).then(() => {
        _callback();
      });
    }


  },
  created: function(){

    // check if user is using IE
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv:11\./)) {
      this.browserOutdated = true;
    }

    if (this.browserOutdated === false) {

      // add event listeners
      let v = this;
      window.addEventListener('keydown', (e) => {
        if (v.currentlyPressedKeys.map((k) => { return k.key }).includes(e.key) !== true) {
          v.keyFunction(e);
        }
      });
      window.addEventListener('keyup', (e) => {
        v.currentlyPressedKeys = v.currentlyPressedKeys.filter(k => k.key !== e.key)
        if (this.thumbWaitInterval != null) {
          clearInterval(v.thumbWaitInterval);
          v.waitText = "";
        }
      });

      // getting participant ID from URL
      var urlParams = new URLSearchParams(window.location.search);
      this.participant_id = urlParams.get('ppt');
      if (this.participant_id !== null) {
        this.participant_id = this.participant_id.replaceAll(".", "|")
      }

      this.test_mode = (urlParams.get('TEST_MODE') === 'yes');
      this.clockPosition = urlParams.get('clock_position');
      this.day = Number(urlParams.get('day'));

      // determine whether participant has arrived at the right time,
      // based on whether they've
      var ccs = fb_functions.httpsCallable('calcCompletionStatus');
        ccs({
          'participant_id': this.participant_id,
          'day': this.day
        }).then((res) => {

          if (this.test_mode === true && res.data === null) {
            this.prevDayIncomplete = false;
            this.alreadyDone = false;
          } else {
            this.prevDayIncomplete = res.data.prevDayIncomplete;
            this.alreadyDone = res.data.alreadyDone;
          }

          if (this.alreadyDone === false) {
            if (this.day != 1) {

              this.updateTimeRemaining(this.day - 1, () => {

                // update timingCorrect dynamically
                if (this.minsRemaining > 0) {
                  this.timingCorrect = "early";
                } else {
                  this.timingCorrect = "just right";
                }

              });

            } else {
              this.timingCorrect = "just right";
            }
          }

        })

      // set experimental & counterbalancing conditions
      var gpc = fb_functions.httpsCallable('getPptData');
      gpc({
        ppt_id: 'ppt/' + this.participant_id,
        attribute: ['exp_cond', 'cb_cond'],
        set_if_null: true,
        add_to_db: this.test_mode
      }).then((res) => {

          this.exp_cond = res.data.exp_cond;
          this.cb_cond = res.data.cb_cond;

          // get stimuli from CSV file
          var stim_file = '/static/stimuli.csv'
          if (this.test_mode) {
            stim_file = '/static/stimuli-small.csv';
          }

          fetch(stim_file)
            .then(response => response.text())
            .then(data => {
              this.stimList = Papa.parse(data, {
                  'header': true,
                  'skipEmptyLines': true,
                  'columns': ['stim_id', 'cb_cond', 'exp_cond', 'twister']
              }).data;

              // filter by day and conditions:

              // retrive experimental condition for this day
              var exp_cond_today = this.exp_cond.split("-")[Math.round((this.day) / 2) - 1];
              this.stimList = this.stimList.filter(item => {

                return (item.exp_cond == exp_cond_today
                        && item.cb_cond == this.cb_cond)

              });

              // randomize stimulus list
              this.shuffle(this.stimList);

              if (this.day % 2 === 1) {
                // Day 1 & 3: pick half at random
                this.stimList = this.stimList.slice(0, this.stimList.length / 2)
                return(this.stimList);

              } else {

                // Day 2 & 4: pick whichever words weren't already picked yesterday
                var gs = fb_functions.httpsCallable('getStims');
                return gs({
                  participant_id: this.participant_id,
                  day: this.day - 1
                }).then((res) => {
                  let prev_stim_ids = res.data;

                  // console.log(prev_stim_ids);

                  if (prev_stim_ids === null) {
                    console.log("Sorry! Not enough data to create stimulus list.");
                    this.stimList = null;

                    // remove experimental task from taskList
                    this.taskList = this.taskList.filter(item => item.name != "button-pressing");


                  } else {
                    this.stimList = this.stimList.filter(item => {
                        return !(prev_stim_ids.includes(item.stim_id));
                      });

                    return (this.stimList);

                    // console.log(this.stimList);
                  }

                });

              }

            }).then((stims_to_upload) => {

              // upload stimulus list to database
              this.uploadData({
                'participant_id': 'ppt/' + this.participant_id,
                'day': this.day,
                'stimList': stims_to_upload
              });

            })

        });
    }
  },
}

</script>

<style src="./assets/style.css"></style>

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

    <h1 v-if="taskList[currentTask].name !== 'button-pressing'">Task {{currentTask + 1}} of {{taskList.length}}: {{ taskList[currentTask].title }}</h1>

    <!-- instructions -->
    <instructions
      v-if="taskList[currentTask].name === 'equipment-setup'"
      :n-stim="stimList.length"
      :day="day"
      :test-mode="test_mode"
      :fingers-to-keys="fingersToKeys"
      :key-pressed="lastKeypress.key"
      :currently-pressed-keys="currentlyPressedKeys.map((item) => {return item.key })"
      @advance="currentTask++"
      :key-abbrevs="keyAbbrevs"
    ></instructions>

    <!-- TODO: actual trials -->
    <trial-loop
      v-if="taskList[currentTask].name === 'button-pressing'"
      :stim-list="stimList"
      :currently-pressed-keys = "currentlyPressedKeys.map((item) => {return item.key })"
      :advance-keys="[fingersToKeys['left thumb'], fingersToKeys['right thumb']]"
      :advance-key-text="'both thumbs'"
      :fingers-to-keys="fingersToKeys"
      :refresher-freq="20"
      @advance="currentTask++"
      @upload="uploadTrial"
      :key-abbrevs="keyAbbrevs"
    ></trial-loop>


    <!--post-task survey-->
    <div v-if="taskList[currentTask].name == 'survey' && expOver === false">
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
<div v-if="unfocused" class="overlay">
  <p>Please click here and put your hands on the provided keyboard to continue the experiment.</p>
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
import trialLoop from './components/trial_parts/trial-loop.vue'

// Initialize Cloud Functions through Firebase
import { fb_functions } from "./fb_init.js"

// vendor libraries
import Papa from 'papaparse';

export default {
  name: 'ExperimentSession',
  components: {
    instructions,
    postTaskSurvey,
    trialLoop
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
          name: 'equipment-setup',
          title: "Equipment Setup and Instructions"
        },
        {
          name: 'button-pressing'
        },
        {
          name: 'survey',
          title: "Post-Task Survey"
        }
      ], // task info, in order of appearance
      currentTask: 0, // keeps track of which task is active
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
      unfocused: false,
      currentlyPressedKeys: [],
      waitText: "",
      thumbWaitInterval: null,
      keyAbbrevs: { // key abbreviations within stimuli
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

      return;

    },
    uploadData: fb_functions.httpsCallable('uploadData'),
    uploadTrial: function(payload) {
      // augment payload with context
      payload.participant_id = this.participant_id
      payload.day = this.day


      // upload trial data to server
      var ut = fb_functions.httpsCallable('uploadTrial');
      ut(payload).then((res) => {
        console.log(res.data);
      })


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
        this.expOver = true;
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

      // keys:
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

      // window blur
      window.addEventListener('blur', () => {
        v.unfocused = true;
      })
      window.addEventListener('focus', () => {
        v.unfocused = false;
      })

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

          if (this.test_mode === true) {
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

// randomly pick a variable from an array
function pick_random(array) {
  return(array[Math.floor(Math.random() * array.length)])
}

let options = {
  'cb_cond': ['thumb-L->index-L; thumb-R->index-R',
    'thumb-L->index-L; thumb-R->middle-R',
    'thumb-L->index-L; thumb-R->ring-R',
    'thumb-L->index-R; thumb-R->index-L',
    'thumb-L->index-R; thumb-R->middle-L',
    'thumb-L->index-R; thumb-R->ring-L',
    'thumb-L->middle-L; thumb-R->index-R',
    'thumb-L->middle-L; thumb-R->middle-R',
    'thumb-L->middle-L; thumb-R->ring-R',
    'thumb-L->middle-R; thumb-R->index-L',
    'thumb-L->middle-R; thumb-R->middle-L',
    'thumb-L->middle-R; thumb-R->ring-L',
    'thumb-L->ring-L; thumb-R->index-R',
    'thumb-L->ring-L; thumb-R->middle-R',
    'thumb-L->ring-L; thumb-R->ring-R',
    'thumb-L->ring-R; thumb-R->index-L',
    'thumb-L->ring-R; thumb-R->middle-L',
    'thumb-L->ring-R; thumb-R->ring-L'
  ],
  'exp_cond': ["onset", "coda"]
}

function init_randomly(attribute_name) {
  return pick_random(options[attribute_name])
}

// initializer for each attribute that shouldn't just be picked randomly from options
let initializers = {
}

exports.initialize = function(attribute_name, argument = null) {

  if (attribute_name in initializers) {
    let init_func = initializers[attribute_name]
    if (init_func.length === 0) {
      return init_func()
    } else {
      return init_func(argument)
    }
  } else {
    return init_randomly(attribute_name)
  }


}

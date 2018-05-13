// The model!
function init(Schema, mongoose) {
  var TheSchema = new Schema({
    title: String,
    file: String,
    complete: Boolean
  });

  return mongoose.model('TodoBreaker', TheSchema);
}

module.exports.init = init;

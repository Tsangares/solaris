const mongoose = require('mongoose');
import mongooseLeanDefaults from 'mongoose-lean-defaults';

import schema from './schemas/event';

schema.plugin(mongooseLeanDefaults);

const model = mongoose.model('gameEvent', schema);

export default model;

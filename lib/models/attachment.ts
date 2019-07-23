import { Types, Document, Model, Schema, model } from 'mongoose'
import Debug from 'debug'

export interface AttachmentDocument extends Document {
  page: Types.ObjectId
  creator: Types.ObjectId
  filePath: string
  fileName: string
  originalName: string
  fileFormat: string
  fileSize: number
  createdAt: Date
  // virtual
  fileURL: string
}

export interface AttachmentModel extends Model<AttachmentDocument> {
  getListByPageId(id: Types.ObjectId): Promise<AttachmentDocument[]>
  guessExtByFileType(fileType: string): string
  createAttachmentFilePath(pageId: Types.ObjectId, fileName: string, fileType: string): string
  removeAttachmentsByPageId(pageId: Types.ObjectId): any
  findDeliveryFile(attachment: AttachmentDocument, forceUpdate: boolean): any
  removeAttachment(attachment: AttachmentDocument): any
}

export default crowi => {
  const debug = Debug('crowi:models:attachment')
  const fileUploader = require('../util/fileUploader')(crowi)

  function generateFileHash(fileName) {
    var hasher = require('crypto').createHash('md5')
    hasher.update(fileName)

    return hasher.digest('hex')
  }

  const attachmentSchema = new Schema<AttachmentDocument, AttachmentModel>(
    {
      page: { type: Schema.Types.ObjectId, ref: 'Page', index: true },
      creator: { type: Schema.Types.ObjectId, ref: 'User', index: true },
      filePath: { type: String, required: true },
      fileName: { type: String, required: true },
      originalName: { type: String },
      fileFormat: { type: String, required: true },
      fileSize: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
    },
    {
      toJSON: {
        virtuals: true,
      },
    },
  )

  attachmentSchema.virtual('fileUrl').get(function(this: AttachmentDocument) {
    ;`/files/${this._id}`
  })

  const Attachment = model<AttachmentDocument, AttachmentModel>('Attachment', attachmentSchema)

  attachmentSchema.statics.getListByPageId = function(id) {
    var self = this

    return new Promise(function(resolve, reject) {
      self
        .find({ page: id })
        .sort({ updatedAt: 1 })
        .populate('creator')
        .exec(function(err, data) {
          if (err) {
            return reject(err)
          }

          if (data.length < 1) {
            return resolve([])
          }

          return resolve(data)
        })
    })
  }

  attachmentSchema.statics.guessExtByFileType = function(fileType) {
    let ext = ''
    const isImage = fileType.match(/^image\/(.+)/i)

    if (isImage) {
      ext = isImage[1].toLowerCase()
    }

    return ext
  }

  attachmentSchema.statics.createAttachmentFilePath = function(pageId, fileName, fileType) {
    let ext = ''
    const fnExt = fileName.match(/(.*)(?:\.([^.]+$))/)

    if (fnExt) {
      ext = '.' + fnExt[2]
    } else {
      ext = Attachment.guessExtByFileType(fileType)
      if (ext !== '') {
        ext = '.' + ext
      }
    }

    return 'attachment/' + pageId + '/' + generateFileHash(fileName) + ext
  }

  attachmentSchema.statics.removeAttachmentsByPageId = function(pageId) {
    return new Promise((resolve, reject) => {
      Attachment.getListByPageId(pageId)
        .then(attachments => {
          for (const attachment of attachments) {
            Attachment.removeAttachment(attachment)
              .then(res => {
                // do nothing
              })
              .catch(err => {
                debug('Attachment remove error', err)
              })
          }

          resolve(attachments)
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  attachmentSchema.statics.findDeliveryFile = function(attachment, forceUpdate) {
    // TODO
    var forceUpdate = forceUpdate || false

    return fileUploader.findDeliveryFile(attachment._id, attachment.filePath)
  }

  attachmentSchema.statics.removeAttachment = function(attachment) {
    const filePath = attachment.filePath

    return new Promise((resolve, reject) => {
      Attachment.remove({ _id: attachment._id }, err => {
        if (err) {
          return reject(err)
        }

        fileUploader
          .deleteFile(attachment._id, filePath)
          .then(data => {
            resolve(data) // this may null
          })
          .catch(err => {
            reject(err)
          })
      })
    })
  }

  return Attachment
}

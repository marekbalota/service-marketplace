import { t, type UnwrapSchema } from 'elysia'

const messageItem = t.Object({
  messageId: t.String(),
  content:   t.String(),
  createdAt: t.Date(),
  sentByMe:  t.Boolean(),
  readAt:    t.Nullable(t.Date()),
})

const threadItem = t.Object({
  threadId:       t.String(),
  postId:         t.String(),
  postTitle:      t.String(),
  postType:       t.Union([t.Literal('OFFER'), t.Literal('REQUEST')]),
  otherPartyName: t.String(),
  lastMessage:    t.Nullable(t.Object({
    content:   t.String(),
    createdAt: t.Date(),
    sentByMe:  t.Boolean(),
  })),
  unreadCount: t.Number(),
  myRole:      t.Union([t.Literal('initiator'), t.Literal('post_owner')]),
  label:       t.Union([t.Literal('offer'), t.Literal('request')]),
})

export const MessagesModel = {
  findAllQuery: t.Object({
    profileId: t.String(),
    postId:    t.Optional(t.String()),
  }),
  findAllResponse: t.Array(threadItem),

  createThreadBody: t.Object({
    profileId: t.String(),
    postId:    t.String(),
    content:   t.String({ minLength: 1 }),
  }),
  createThreadResponse: t.Object({ threadId: t.String() }),

  threadParams: t.Object({ threadId: t.String() }),
  threadProfileQuery: t.Object({ profileId: t.String() }),
  findThreadResponse: t.Object({
    threadId:       t.String(),
    postId:         t.String(),
    postTitle:      t.String(),
    postType:       t.Union([t.Literal('OFFER'), t.Literal('REQUEST')]),
    otherPartyName: t.String(),
    myRole:         t.Union([t.Literal('initiator'), t.Literal('post_owner')]),
    label:          t.Union([t.Literal('offer'), t.Literal('request')]),
    messages:       t.Array(messageItem),
  }),

  sendMessageBody: t.Object({
    profileId: t.String(),
    content:   t.String({ minLength: 1 }),
  }),
  sendMessageResponse: messageItem,
} as const

export type MessagesModel = {
  [k in keyof typeof MessagesModel]: UnwrapSchema<typeof MessagesModel[k]>
}

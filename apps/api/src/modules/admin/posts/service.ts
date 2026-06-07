import { db } from '../../../db'
import { posts } from '../../../db/schema'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { NotFoundError, ErrorMessages } from '../../../lib/errors'
import { sendPostBannedEmail, sendPostUnbannedEmail } from '../../../lib/email'

export abstract class AdminPostsService {
  static async ban(postId: string, banReason: string): Promise<void> {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, postId), isNull(posts.bannedAt)),
      columns: { postId: true, postTitle: true, authorId: true },
      with: { author: { columns: { email: true } } },
    })

    if (!post) throw new NotFoundError(ErrorMessages.postNotFound)

    await db.update(posts).set({ bannedAt: new Date(), banReason }).where(eq(posts.postId, postId))

    void sendPostBannedEmail({
      recipientEmail: post.author.email,
      postTitle: post.postTitle,
      banReason,
    })
  }

  static async unban(postId: string): Promise<void> {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, postId), isNotNull(posts.bannedAt)),
      columns: { postId: true, postTitle: true },
      with: { author: { columns: { email: true } } },
    })

    if (!post) throw new NotFoundError(ErrorMessages.postNotFound)

    await db.update(posts).set({ bannedAt: null, banReason: null }).where(eq(posts.postId, postId))

    void sendPostUnbannedEmail({
      recipientEmail: post.author.email,
      postTitle: post.postTitle,
    })
  }
}

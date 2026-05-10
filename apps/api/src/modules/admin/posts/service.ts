import { db } from '../../../db'
import { posts } from '../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { NotFoundError, ErrorMessages } from '../../../lib/errors'

export abstract class AdminPostsService {
  static async deleteAny(postId: string): Promise<void> {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, postId), isNull(posts.deletedAt)),
      columns: { postId: true },
    })

    if (!post) throw new NotFoundError(ErrorMessages.postNotFound)

    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.postId, postId))
  }
}

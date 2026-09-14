import { prisma } from "@/server/db/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export class AuthService {
  /**
   * Request password reset token
   */
  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return success generic response to prevent user enumeration attacks
      return { success: true, message: "If account exists, password reset instructions have been generated." };
    }

    // Delete previous tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires,
      },
    });

    return {
      success: true,
      token: resetToken.token,
      expires: resetToken.expires,
      message: "Password reset token generated successfully.",
    };
  }

  /**
   * Confirm password reset using valid unexpired token
   */
  static async confirmPasswordReset(token: string, newPassword: string) {
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      throw new Error("Invalid or expired password reset token");
    }

    if (new Date() > resetRecord.expires) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      throw new Error("Password reset token has expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetRecord.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetRecord.id },
      }),
    ]);

    return {
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    };
  }

  /**
   * Request email verification token
   */
  static async requestEmailVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new Error("User account not found");
    }

    if (user.emailVerified) {
      return { success: true, message: "Email address is already verified." };
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const verifyToken = await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    return {
      success: true,
      token: verifyToken.token,
      expires: verifyToken.expires,
      message: "Verification token generated successfully.",
    };
  }

  /**
   * Confirm email verification using valid unexpired token
   */
  static async confirmEmailVerification(token: string) {
    const verifyRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verifyRecord) {
      throw new Error("Invalid or expired verification token");
    }

    if (new Date() > verifyRecord.expires) {
      await prisma.verificationToken.delete({ where: { id: verifyRecord.id } });
      throw new Error("Verification token has expired");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verifyRecord.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { id: verifyRecord.id },
      }),
    ]);

    return {
      success: true,
      message: "Email address verified successfully.",
    };
  }
}

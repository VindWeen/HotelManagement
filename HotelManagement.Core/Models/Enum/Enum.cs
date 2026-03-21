namespace HotelManagement.Core.Models.Enum
{
    public enum NotificationType
    {
        Success,
        Error,
        Warning,
        Info
    }
    public enum NotificationAction
    {
        CreateAccount,
        UpdateAccount,
        ResetPassword,
        LockAccount,
        LoginAccount,
        UnlockAccount
    }
}
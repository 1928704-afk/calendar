package com.department.calendar.repository;

import com.department.calendar.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientNameOrderByCreatedAtDesc(String recipientName);

    long countByRecipientNameAndIsReadFalse(String recipientName);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipientName = :recipientName AND n.isRead = false")
    int markAllAsRead(@Param("recipientName") String recipientName);
}
